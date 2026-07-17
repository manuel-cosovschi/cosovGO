'use server';

import { createServerClient } from '@/lib/supabase/server';
import { productSchema } from '@/lib/validations/product';
import { slugify } from '@/lib/utils';
import { getProductUnitCosts } from '@/lib/production-cost';
import { revalidatePath } from 'next/cache';
import type { Product, CreateProductInput, UpdateProductInput, ProductFilters } from '@/types';

export type ProductWithCost = Product & { unit_cost: number };

export async function listAllProducts(filters?: ProductFilters): Promise<Product[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('sort_order');

  if (filters?.category_id) query = query.eq('category_id', filters.category_id);
  if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

  const { data } = await query;
  return (data as Product[]) || [];
}

/** Lista de productos con el costo unitario de producción calculado. */
export async function listProductsWithCost(filters?: ProductFilters): Promise<ProductWithCost[]> {
  const products = await listAllProducts(filters);
  const costs = await getProductUnitCosts(products.map((p) => p.id));
  return products.map((p) => ({
    ...p,
    unit_cost: Math.round((costs.get(p.id) || 0) * 100) / 100,
  }));
}

/**
 * Recalcula el costo unitario de los productos indicados (o todos si no se pasa
 * ninguno) y, si cambió respecto del último snapshot, guarda el valor anterior
 * y la fecha. Sirve para mostrar cuánto subió el costo (y cuándo) cada vez que
 * se actualiza el precio de la materia prima.
 */
export async function snapshotProductCosts(productIds?: string[]): Promise<void> {
  const supabase = await createServerClient();

  let ids = productIds;
  if (!ids || ids.length === 0) {
    const { data } = await supabase.from('products').select('id');
    ids = (data || []).map((p) => p.id);
  }
  if (ids.length === 0) return;

  const costs = await getProductUnitCosts(ids);

  const { data: current } = await supabase
    .from('products')
    .select('id, cost_snapshot, cost_snapshot_at')
    .in('id', ids);

  const snapById = new Map(
    (current || []).map((p) => [p.id, { cost: p.cost_snapshot, at: p.cost_snapshot_at }])
  );
  const now = new Date().toISOString();

  for (const id of ids) {
    const newCost = Math.round((costs.get(id) || 0) * 100) / 100;
    if (newCost <= 0) continue; // sin costo cargado, no registramos nada

    const prev = snapById.get(id);
    const prevCost = prev?.cost != null ? Number(prev.cost) : null;

    // Sin cambios reales → no tocamos el historial
    if (prevCost != null && Math.abs(prevCost - newCost) < 0.005) continue;

    await supabase
      .from('products')
      .update({
        cost_prev: prevCost,
        cost_prev_at: prevCost != null ? prev?.at ?? null : null,
        cost_snapshot: newCost,
        cost_snapshot_at: now,
      })
      .eq('id', id);
  }

  revalidatePath('/admin/productos');
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();
  return data as Product | null;
}

export async function createProduct(input: CreateProductInput): Promise<{
  success: boolean;
  product?: Product;
  error?: string;
}> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerClient();
  const slug = slugify(input.name);

  const { data, error } = await supabase
    .from('products')
    .insert({ ...parsed.data, slug })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un producto con ese nombre.' };
    }
    return { success: false, error: 'Error al crear el producto.' };
  }

  await snapshotProductCosts([data.id]);

  revalidatePath('/admin/productos');
  revalidatePath('/catalogo');
  return { success: true, product: data as Product };
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<{
  success: boolean;
  product?: Product;
  error?: string;
}> {
  const supabase = await createServerClient();

  const updateData: Record<string, unknown> = { ...input };
  if (input.name) {
    updateData.slug = slugify(input.name);
  }

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Error al actualizar el producto.' };
  }

  // Si tocó el costo (override), registramos la variación de costo.
  if ('cost_override' in input) {
    await snapshotProductCosts([id]);
  }

  revalidatePath('/admin/productos');
  revalidatePath('/catalogo');
  return { success: true, product: data as Product };
}

export async function toggleProductActive(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();

  const { data: product } = await supabase
    .from('products')
    .select('is_active')
    .eq('id', id)
    .single();

  if (!product) return { success: false, error: 'Producto no encontrado.' };

  const { error } = await supabase
    .from('products')
    .update({ is_active: !product.is_active })
    .eq('id', id);

  if (error) return { success: false, error: 'Error al cambiar estado.' };

  revalidatePath('/admin/productos');
  revalidatePath('/catalogo');
  return { success: true };
}

export async function deleteProduct(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) return { success: false, error: 'Error al eliminar el producto.' };

  revalidatePath('/admin/productos');
  revalidatePath('/catalogo');
  return { success: true };
}
