'use server';

import { createServerClient } from '@/lib/supabase/server';
import type {
  InventoryValuation,
  OrderTracking,
  OrderStatus,
  StockMovement,
} from '@/types';

// === Inventory Valuation ===
// Valen carga el stock de ingredientes a mano (una vez por semana) y solo
// quiere ver el valor total de esa materia prima. No hay descuentos automáticos
// ni alertas ni sugerencias de compra.

export async function getInventoryValuation(): Promise<InventoryValuation> {
  const supabase = await createServerClient();

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('stock_quantity, cost_per_unit')
    .eq('is_active', true);

  const ingredientsValue = (ingredients || []).reduce(
    (sum, ing) => sum + ing.stock_quantity * ing.cost_per_unit,
    0
  );

  const rounded = Math.round(ingredientsValue * 100) / 100;

  return {
    ingredients_value: rounded,
    products_value: 0,
    committed_cost: 0,
    total_value: rounded,
  };
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
