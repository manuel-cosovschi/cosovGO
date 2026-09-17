'use server';

import { createServerClient } from '@/lib/supabase/server';
import { productoParaCanal, visibleEnCanal, type Canal } from '@/lib/canal';
import type { Product, Category, PackageDetail } from '@/types';

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  return (data as Category[]) || [];
}

/**
 * Productos del catálogo de un canal.
 *
 * Devuelve cada producto con el precio y los mínimos del canal ya aplicados,
 * así quien lo consume lee `product.price` sin saber que hay dos listas.
 */
export async function getActiveProducts(
  canal: Canal = 'mayorista',
  categorySlug?: string
): Promise<Product[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('sort_order');

  if (categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();
    if (cat) {
      query = query.eq('category_id', cat.id);
    }
  }

  const { data } = await query;
  return ((data as Product[]) || [])
    .filter((p) => visibleEnCanal(p, canal))
    .map((p) => productoParaCanal(p, canal));
}

export async function getProductBySlug(
  slug: string,
  canal: Canal = 'mayorista'
): Promise<Product | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const product = data as Product | null;
  if (!product || !visibleEnCanal(product, canal)) return null;

  return productoParaCanal(product, canal);
}

export async function getActivePackages(): Promise<PackageDetail[]> {
  const supabase = await createServerClient();
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (!packages || packages.length === 0) return [];

  const packageIds = packages.map((p) => p.id);
  const { data: items } = await supabase
    .from('package_items')
    .select('*, product:products(*)')
    .in('package_id', packageIds);

  return packages.map((pkg) => ({
    ...pkg,
    items: (items || []).filter((i) => i.package_id === pkg.id),
  })) as PackageDetail[];
}

export async function getPackageBySlug(slug: string): Promise<PackageDetail | null> {
  const supabase = await createServerClient();
  const { data: pkg } = await supabase
    .from('packages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!pkg) return null;

  const { data: items } = await supabase
    .from('package_items')
    .select('*, product:products(*)')
    .eq('package_id', pkg.id);

  return { ...pkg, items: items || [] } as PackageDetail;
}

export async function getPublicSettings(): Promise<{ minAdvanceHours: number }> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'min_advance_hours')
    .single();
  return { minAdvanceHours: data ? Number(data.value) : 48 };
}
