'use server';

import { createServerClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types';

export async function listAllCategories(): Promise<Category[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  return (data as Category[]) || [];
}

export async function createCategory(input: CreateCategoryInput): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!input.name?.trim()) return { success: false, error: 'El nombre es obligatorio.' };

  const supabase = await createServerClient();
  const { error } = await supabase.from('categories').insert({
    name: input.name,
    slug: slugify(input.name),
    description: input.description || null,
    sort_order: input.sort_order || 0,
  });

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Ya existe una categoría con ese nombre.' };
    return { success: false, error: 'Error al crear la categoría.' };
  }

  revalidatePath('/admin/categorias');
  revalidatePath('/catalogo');
  return { success: true };
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();
  const updateData: Record<string, unknown> = { ...input };
  if (input.name) updateData.slug = slugify(input.name);

  const { error } = await supabase.from('categories').update(updateData).eq('id', id);
  if (error) return { success: false, error: 'Error al actualizar.' };

  revalidatePath('/admin/categorias');
  revalidatePath('/catalogo');
  return { success: true };
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { success: false, error: 'Error al eliminar. Verificá que no tenga productos asociados.' };

  revalidatePath('/admin/categorias');
  revalidatePath('/catalogo');
  return { success: true };
}
