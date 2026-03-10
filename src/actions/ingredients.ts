'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  Ingredient,
  CreateIngredientInput,
  UpdateIngredientInput,
  StockAdjustment,
  RecipeItem,
  StockMovement,
} from '@/types';

// === Ingredients CRUD ===

export async function listIngredients(onlyActive?: boolean): Promise<Ingredient[]> {
  const supabase = await createServerClient();
  let query = supabase.from('ingredients').select('*').order('name');
  if (onlyActive) query = query.eq('is_active', true);
  const { data } = await query;
  return (data as Ingredient[]) || [];
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.from('ingredients').select('*').eq('id', id).single();
  return data as Ingredient | null;
}

export async function createIngredient(input: CreateIngredientInput): Promise<{
  success: boolean;
  ingredient?: Ingredient;
  error?: string;
}> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      name: input.name,
      unit: input.unit,
      stock_quantity: input.stock_quantity ?? 0,
      min_stock_quantity: input.min_stock_quantity ?? 0,
      cost_per_unit: input.cost_per_unit ?? 0,
      supplier: input.supplier || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un ingrediente con ese nombre.' };
    }
    return { success: false, error: 'Error al crear el ingrediente.' };
  }

  // Log initial stock if > 0
  if ((input.stock_quantity ?? 0) > 0) {
    await supabase.from('stock_movements').insert({
      reference_type: 'ingredient',
      reference_id: data.id,
      movement_type: 'adjustment',
      quantity: input.stock_quantity,
      unit_cost: input.cost_per_unit ?? 0,
      notes: 'Stock inicial',
    });
  }

  revalidatePath('/admin/ingredientes');
  revalidatePath('/admin');
  return { success: true, ingredient: data as Ingredient };
}

export async function updateIngredient(
  id: string,
  input: UpdateIngredientInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase.from('ingredients').update(input).eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un ingrediente con ese nombre.' };
    }
    return { success: false, error: 'Error al actualizar el ingrediente.' };
  }

  revalidatePath('/admin/ingredientes');
  revalidatePath(`/admin/ingredientes/${id}`);
  return { success: true };
}

export async function adjustIngredientStock(
  id: string,
  adjustment: StockAdjustment
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('stock_quantity')
    .eq('id', id)
    .single();

  if (!ingredient) return { success: false, error: 'Ingrediente no encontrado.' };

  const diff = adjustment.new_quantity - ingredient.stock_quantity;

  const { data: { user } } = await supabase.auth.getUser();

  // Update stock
  const { error } = await supabase
    .from('ingredients')
    .update({ stock_quantity: adjustment.new_quantity })
    .eq('id', id);

  if (error) return { success: false, error: 'Error al ajustar stock.' };

  // Log movement
  await supabase.from('stock_movements').insert({
    reference_type: 'ingredient',
    reference_id: id,
    movement_type: 'adjustment',
    quantity: diff,
    notes: adjustment.notes,
    created_by: user?.id || null,
  });

  revalidatePath('/admin/ingredientes');
  revalidatePath(`/admin/ingredientes/${id}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function registerPurchase(
  ingredientId: string,
  quantity: number,
  unitCost: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Update stock and cost
  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('stock_quantity')
    .eq('id', ingredientId)
    .single();

  if (!ingredient) return { success: false, error: 'Ingrediente no encontrado.' };

  const { error } = await supabase
    .from('ingredients')
    .update({
      stock_quantity: ingredient.stock_quantity + quantity,
      cost_per_unit: unitCost,
    })
    .eq('id', ingredientId);

  if (error) return { success: false, error: 'Error al registrar compra.' };

  await supabase.from('stock_movements').insert({
    reference_type: 'ingredient',
    reference_id: ingredientId,
    movement_type: 'purchase',
    quantity,
    unit_cost: unitCost,
    notes: notes || 'Compra registrada',
    created_by: user?.id || null,
  });

  revalidatePath('/admin/ingredientes');
  revalidatePath(`/admin/ingredientes/${ingredientId}`);
  revalidatePath('/admin');
  return { success: true };
}

// === Recipes ===

export async function getProductRecipe(productId: string): Promise<RecipeItem[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('recipe_items')
    .select('*, ingredient:ingredients(*)')
    .eq('product_id', productId);
  return (data as RecipeItem[]) || [];
}

export async function saveProductRecipe(
  productId: string,
  batchSize: number,
  items: { ingredient_id: string; quantity_per_batch: number }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  // Update batch_size on product
  await supabase.from('products').update({ batch_size: batchSize }).eq('id', productId);

  // Delete existing recipe items
  await supabase.from('recipe_items').delete().eq('product_id', productId);

  // Insert new recipe items
  if (items.length > 0) {
    const { error } = await supabase.from('recipe_items').insert(
      items.map((item) => ({
        product_id: productId,
        ingredient_id: item.ingredient_id,
        quantity_per_batch: item.quantity_per_batch,
      }))
    );
    if (error) return { success: false, error: 'Error al guardar la receta.' };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}

// === Product Stock ===

export async function adjustProductStock(
  productId: string,
  adjustment: StockAdjustment
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (!product) return { success: false, error: 'Producto no encontrado.' };

  const diff = adjustment.new_quantity - product.stock_quantity;
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: adjustment.new_quantity })
    .eq('id', productId);

  if (error) return { success: false, error: 'Error al ajustar stock.' };

  await supabase.from('stock_movements').insert({
    reference_type: 'product',
    reference_id: productId,
    movement_type: 'adjustment',
    quantity: diff,
    notes: adjustment.notes,
    created_by: user?.id || null,
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function registerProduction(
  productId: string,
  batches: number,
  notes?: string
): Promise<{ success: boolean; alerts?: string[]; error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const alerts: string[] = [];

  // Get product with batch_size
  const { data: product } = await supabase
    .from('products')
    .select('id, name, stock_quantity, batch_size')
    .eq('id', productId)
    .single();

  if (!product) return { success: false, error: 'Producto no encontrado.' };

  const unitsProduced = batches * (product.batch_size || 1);

  // Get recipe
  const { data: recipe } = await supabase
    .from('recipe_items')
    .select('*, ingredient:ingredients(*)')
    .eq('product_id', productId);

  // Deduct ingredients
  if (recipe && recipe.length > 0) {
    for (const item of recipe) {
      const consumption = item.quantity_per_batch * batches;
      const ingredient = item.ingredient as Ingredient;

      const newStock = ingredient.stock_quantity - consumption;

      await supabase
        .from('ingredients')
        .update({ stock_quantity: newStock })
        .eq('id', item.ingredient_id);

      await supabase.from('stock_movements').insert({
        reference_type: 'ingredient',
        reference_id: item.ingredient_id,
        movement_type: 'production_consumption',
        quantity: -consumption,
        notes: `Producción: ${batches} lote(s) de ${product.name}`,
        created_by: user?.id || null,
      });

      if (newStock < ingredient.min_stock_quantity) {
        alerts.push(`Stock bajo de ${ingredient.name}: quedan ${newStock} ${ingredient.unit}`);
      }
    }
  } else {
    alerts.push(`${product.name} no tiene receta cargada. No se descontaron ingredientes.`);
  }

  // Add produced units to product stock
  await supabase
    .from('products')
    .update({ stock_quantity: product.stock_quantity + unitsProduced })
    .eq('id', productId);

  await supabase.from('stock_movements').insert({
    reference_type: 'product',
    reference_id: productId,
    movement_type: 'production',
    quantity: unitsProduced,
    notes: notes || `Producción: ${batches} lote(s) = ${unitsProduced} unidades`,
    created_by: user?.id || null,
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/ingredientes');
  revalidatePath('/admin');
  return { success: true, alerts: alerts.length > 0 ? alerts : undefined };
}

// === Stock Movements History ===

export async function getStockMovements(
  referenceType: 'ingredient' | 'product',
  referenceId: string,
  limit = 20
): Promise<StockMovement[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as StockMovement[]) || [];
}
