'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  StockAlert,
  InventoryValuation,
  PurchaseSuggestion,
  OrderTracking,
  OrderStatus,
  Ingredient,
  StockMovement,
} from '@/types';
import { ORDER_STATUS_LABELS, VALID_TRANSITIONS } from '@/types';
import { sendOrderStatusUpdate } from '@/lib/emails';

// === Stock Alerts ===

export async function generateStockAlerts(): Promise<StockAlert[]> {
  const supabase = await createServerClient();
  const alerts: StockAlert[] = [];

  // Low ingredient stock
  const { data: lowIngredients } = await supabase
    .from('ingredients')
    .select('id, name, stock_quantity, min_stock_quantity, unit')
    .eq('is_active', true)
    .filter('stock_quantity', 'lt', 'min_stock_quantity' as unknown as number);

  // Supabase can't do column-to-column comparison in .filter, so we filter in JS
  const { data: allIngredients } = await supabase
    .from('ingredients')
    .select('id, name, stock_quantity, min_stock_quantity, unit')
    .eq('is_active', true);

  if (allIngredients) {
    for (const ing of allIngredients) {
      if (ing.stock_quantity < ing.min_stock_quantity) {
        alerts.push({
          type: 'low_ingredient',
          severity: ing.stock_quantity <= 0 ? 'critical' : 'warning',
          message: `${ing.name}: ${ing.stock_quantity} ${ing.unit} (mín: ${ing.min_stock_quantity})`,
          reference_id: ing.id,
          reference_name: ing.name,
        });
      }
    }
  }

  // Low product stock
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, stock_quantity, min_stock_quantity, sale_unit')
    .eq('is_active', true);

  if (allProducts) {
    for (const prod of allProducts) {
      if (prod.stock_quantity < prod.min_stock_quantity) {
        alerts.push({
          type: 'low_product',
          severity: prod.stock_quantity <= 0 ? 'critical' : 'warning',
          message: `${prod.name}: ${prod.stock_quantity} ${prod.sale_unit} (mín: ${prod.min_stock_quantity})`,
          reference_id: prod.id,
          reference_name: prod.name,
        });
      }
    }
  }

  // Products without recipe
  const { data: productsWithoutRecipe } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true);

  const { data: productsWithRecipe } = await supabase
    .from('recipe_items')
    .select('product_id');

  if (productsWithoutRecipe && productsWithRecipe) {
    const withRecipeIds = new Set(productsWithRecipe.map((r) => r.product_id));
    for (const prod of productsWithoutRecipe) {
      if (!withRecipeIds.has(prod.id)) {
        alerts.push({
          type: 'missing_recipe',
          severity: 'warning',
          message: `${prod.name} no tiene receta cargada`,
          reference_id: prod.id,
          reference_name: prod.name,
        });
      }
    }
  }

  return alerts;
}

// === Inventory Valuation ===

export async function getInventoryValuation(): Promise<InventoryValuation> {
  const supabase = await createServerClient();

  // Ingredient value: sum(stock_quantity * cost_per_unit)
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('stock_quantity, cost_per_unit')
    .eq('is_active', true);

  const ingredientsValue = (ingredients || []).reduce(
    (sum, ing) => sum + ing.stock_quantity * ing.cost_per_unit,
    0
  );

  // Product value: estimated cost from recipe or cost_override
  const { data: products } = await supabase
    .from('products')
    .select('id, stock_quantity, cost_override, batch_size')
    .eq('is_active', true);

  let productsValue = 0;

  if (products) {
    for (const prod of products) {
      if (prod.stock_quantity <= 0) continue;

      if (prod.cost_override) {
        productsValue += prod.stock_quantity * prod.cost_override;
      } else {
        // Calculate from recipe
        const { data: recipe } = await supabase
          .from('recipe_items')
          .select('quantity_per_batch, ingredient:ingredients(cost_per_unit)')
          .eq('product_id', prod.id);

        if (recipe && recipe.length > 0) {
          const batchCost = recipe.reduce((sum, item) => {
            const ingredient = item.ingredient as unknown as { cost_per_unit: number };
            return sum + item.quantity_per_batch * (ingredient?.cost_per_unit || 0);
          }, 0);
          const unitCost = batchCost / (prod.batch_size || 1);
          productsValue += prod.stock_quantity * unitCost;
        }
      }
    }
  }

  // Committed cost: approved/active/in_production orders
  const { data: committedOrders } = await supabase
    .from('orders')
    .select('subtotal')
    .in('status', ['approved', 'active', 'in_production']);

  const committedCost = (committedOrders || []).reduce(
    (sum, order) => sum + (order.subtotal || 0),
    0
  );

  return {
    ingredients_value: Math.round(ingredientsValue * 100) / 100,
    products_value: Math.round(productsValue * 100) / 100,
    committed_cost: Math.round(committedCost * 100) / 100,
    total_value: Math.round((ingredientsValue + productsValue) * 100) / 100,
  };
}

// === Purchase Suggestions ===

export async function getPurchaseSuggestions(): Promise<PurchaseSuggestion[]> {
  const supabase = await createServerClient();

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, stock_quantity, min_stock_quantity, cost_per_unit')
    .eq('is_active', true);

  if (!ingredients) return [];

  return ingredients
    .filter((ing) => ing.stock_quantity < ing.min_stock_quantity)
    .map((ing) => ({
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      unit: ing.unit,
      current_stock: ing.stock_quantity,
      needed: ing.min_stock_quantity,
      to_buy: Math.max(0, ing.min_stock_quantity - ing.stock_quantity),
      estimated_cost:
        Math.round(Math.max(0, ing.min_stock_quantity - ing.stock_quantity) * ing.cost_per_unit * 100) / 100,
    }))
    .sort((a, b) => b.estimated_cost - a.estimated_cost);
}

// === Stock Deduction on Order Approval ===

export async function approveOrderWithStockImpact(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; alerts?: string[]; error?: string }> {
  const supabase = await createServerClient();
  const alerts: string[] = [];

  // Get order with items
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, email, contact_name, order_number')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado.' };

  const currentStatus = order.status as OrderStatus;
  if (!VALID_TRANSITIONS[currentStatus].includes('approved')) {
    return {
      success: false,
      error: `No se puede aprobar un pedido en estado "${ORDER_STATUS_LABELS[currentStatus]}".`,
    };
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (!items || items.length === 0) {
    return { success: false, error: 'El pedido no tiene items.' };
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Process each item
  for (const item of items) {
    if (!item.product_id) continue; // Skip packages for now (simplified)

    // Get product stock
    const { data: product } = await supabase
      .from('products')
      .select('id, name, stock_quantity, batch_size')
      .eq('id', item.product_id)
      .single();

    if (!product) continue;

    const needed = item.quantity;
    const available = product.stock_quantity;
    const useElaborated = Math.min(available, needed);

    // Deduct from finished product stock
    if (useElaborated > 0) {
      await supabase
        .from('products')
        .update({ stock_quantity: available - useElaborated })
        .eq('id', product.id);

      await supabase.from('stock_movements').insert({
        reference_type: 'product',
        reference_id: product.id,
        movement_type: 'order_deduction',
        quantity: -useElaborated,
        order_id: orderId,
        notes: `Pedido #${order.order_number}: ${useElaborated} ${item.item_name}`,
        created_by: user?.id || null,
      });
    }

    const remaining = needed - useElaborated;

    if (remaining > 0) {
      // Get recipe
      const { data: recipe } = await supabase
        .from('recipe_items')
        .select('*, ingredient:ingredients(*)')
        .eq('product_id', product.id);

      if (recipe && recipe.length > 0) {
        const batchSize = product.batch_size || 1;
        const batchesNeeded = Math.ceil(remaining / batchSize);

        for (const recipeItem of recipe) {
          const ingredient = recipeItem.ingredient as Ingredient;
          const consumption = recipeItem.quantity_per_batch * batchesNeeded;
          const newStock = ingredient.stock_quantity - consumption;

          await supabase
            .from('ingredients')
            .update({ stock_quantity: newStock })
            .eq('id', recipeItem.ingredient_id);

          await supabase.from('stock_movements').insert({
            reference_type: 'ingredient',
            reference_id: recipeItem.ingredient_id,
            movement_type: 'production_consumption',
            quantity: -consumption,
            order_id: orderId,
            notes: `Pedido #${order.order_number}: ${batchesNeeded} lote(s) de ${product.name}`,
            created_by: user?.id || null,
          });

          if (newStock < 0) {
            alerts.push(
              `Faltante: ${ingredient.name} — stock negativo (${newStock.toFixed(2)} ${ingredient.unit})`
            );
          } else if (newStock < ingredient.min_stock_quantity) {
            alerts.push(
              `Stock bajo: ${ingredient.name} — quedan ${newStock.toFixed(2)} ${ingredient.unit}`
            );
          }
        }
      } else {
        alerts.push(`${product.name}: sin receta cargada. No se descontaron ingredientes.`);
      }
    }
  }

  // Update order status to approved
  const { error } = await supabase
    .from('orders')
    .update({ status: 'approved' })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Error al aprobar el pedido.' };

  // Log status change
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: currentStatus,
    to_status: 'approved',
    changed_by: user?.id || null,
    notes: notes || (alerts.length > 0 ? `Aprobado con alertas: ${alerts.join('; ')}` : null),
  });

  // Notify client
  sendOrderStatusUpdate(order.email, {
    contactName: order.contact_name,
    orderNumber: order.order_number,
    newStatus: 'approved' as OrderStatus,
    notes: notes || undefined,
  }).catch(console.error);

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/admin');
  revalidatePath('/admin/ingredientes');

  return { success: true, alerts: alerts.length > 0 ? alerts : undefined };
}

// === Order Tracking (Public) ===

export async function getOrderTracking(orderNumber: number): Promise<OrderTracking | null> {
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (!order) return null;

  const [{ data: items }, { data: history }] = await Promise.all([
    supabase.from('order_items').select('item_name, quantity, unit_price, subtotal').eq('order_id', order.id),
    supabase
      .from('order_status_history')
      .select('to_status, created_at, notes')
      .eq('order_id', order.id)
      .order('created_at'),
  ]);

  return {
    order_number: order.order_number,
    status: order.status as OrderStatus,
    business_name: order.business_name,
    delivery_date: order.delivery_date,
    delivery_method: order.delivery_method,
    items: (items || []).map((i) => ({
      name: i.item_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    })),
    subtotal: order.subtotal,
    timeline: (history || []).map((h) => ({
      status: h.to_status,
      date: h.created_at,
      notes: h.notes,
    })),
    created_at: order.created_at,
  };
}

// === Recent Stock Movements ===

export async function getRecentMovements(limit = 20): Promise<(StockMovement & { reference_name?: string })[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as StockMovement[]) || [];
}
