'use server';

import { createServerClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { Package, PackageDetail, CreatePackageInput, UpdatePackageInput } from '@/types';

export async function listAllPackages(): Promise<PackageDetail[]> {
  const supabase = await createServerClient();
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .order('sort_order');

  if (!packages || packages.length === 0) return [];

  const packageIds = packages.map((p) => p.id);
  const { data: items } = await supabase
    .from('package_items')
    .select('*, product:products(id, name, price)')
    .in('package_id', packageIds);

  return packages.map((pkg) => ({
    ...pkg,
    items: (items || []).filter((i) => i.package_id === pkg.id),
  })) as PackageDetail[];
}

export async function getPackageById(id: string): Promise<PackageDetail | null> {
  const supabase = await createServerClient();
  const { data: pkg } = await supabase.from('packages').select('*').eq('id', id).single();
  if (!pkg) return null;

  const { data: items } = await supabase
    .from('package_items')
    .select('*, product:products(id, name, price)')
    .eq('package_id', pkg.id);

  return { ...pkg, items: items || [] } as PackageDetail;
}

export async function createPackage(input: CreatePackageInput): Promise<{
  success: boolean;
  pkg?: Package;
  error?: string;
}> {
  if (!input.name?.trim()) return { success: false, error: 'El nombre es obligatorio.' };
  if (!input.price || input.price <= 0) return { success: false, error: 'El precio debe ser mayor a 0.' };
  if (!input.items || input.items.length === 0) return { success: false, error: 'Agregá al menos un producto.' };

  const supabase = await createServerClient();
  const slug = slugify(input.name);

  const { data: pkg, error } = await supabase
    .from('packages')
    .insert({
      name: input.name,
      slug,
      description: input.description || null,
      image_url: input.image_url || null,
      price: input.price,
      is_editable: input.is_editable || false,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Ya existe un paquete con ese nombre.' };
    return { success: false, error: 'Error al crear el paquete.' };
  }

  // Insert items
  await supabase.from('package_items').insert(
    input.items.map((item) => ({
      package_id: pkg.id,
      product_id: item.product_id,
      quantity: item.quantity,
    }))
  );

  revalidatePath('/admin/paquetes');
  revalidatePath('/paquetes');
  return { success: true, pkg: pkg as Package };
}

export async function updatePackage(id: string, input: UpdatePackageInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();

  const updateData: Record<string, unknown> = {};
  if (input.name) {
    updateData.name = input.name;
    updateData.slug = slugify(input.name);
  }
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.image_url !== undefined) updateData.image_url = input.image_url || null;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.is_editable !== undefined) updateData.is_editable = input.is_editable;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase.from('packages').update(updateData).eq('id', id);
    if (error) return { success: false, error: 'Error al actualizar el paquete.' };
  }

  // Update items if provided
  if (input.items) {
    await supabase.from('package_items').delete().eq('package_id', id);
    if (input.items.length > 0) {
      await supabase.from('package_items').insert(
        input.items.map((item) => ({
          package_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
    }
  }

  revalidatePath('/admin/paquetes');
  revalidatePath('/paquetes');
  return { success: true };
}

export async function togglePackageActive(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { data: pkg } = await supabase.from('packages').select('is_active').eq('id', id).single();
  if (!pkg) return { success: false, error: 'Paquete no encontrado.' };

  const { error } = await supabase.from('packages').update({ is_active: !pkg.is_active }).eq('id', id);
  if (error) return { success: false, error: 'Error al cambiar estado.' };

  revalidatePath('/admin/paquetes');
  revalidatePath('/paquetes');
  return { success: true };
}

export async function deletePackage(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) return { success: false, error: 'Error al eliminar el paquete.' };

  revalidatePath('/admin/paquetes');
  revalidatePath('/paquetes');
  return { success: true };
}
