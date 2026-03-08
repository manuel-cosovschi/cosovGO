'use server';

import { createServerClient } from '@/lib/supabase/server';
import { productSchema } from '@/lib/validations/product';
import { slugify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { Product, CreateProductInput, UpdateProductInput, ProductFilters } from '@/types';

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
