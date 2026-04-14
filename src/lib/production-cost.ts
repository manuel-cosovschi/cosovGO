import { createServerClient } from '@/lib/supabase/server';

/**
 * Calcula el costo unitario de producción para una lista de productos.
 * Usa `cost_override` si está cargado; si no, suma la receta y divide
 * por `batch_size`. Si no hay ni override ni receta, el costo es 0.
 */
export async function getProductUnitCosts(
  productIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (productIds.length === 0) return result;

  const supabase = await createServerClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, cost_override, batch_size')
    .in('id', productIds);

  if (!products) return result;

  const needsRecipe: { id: string; batch_size: number }[] = [];

  for (const prod of products) {
    if (prod.cost_override != null && prod.cost_override > 0) {
      result.set(prod.id, Number(prod.cost_override));
    } else {
      needsRecipe.push({ id: prod.id, batch_size: prod.batch_size || 1 });
      result.set(prod.id, 0);
    }
  }

  if (needsRecipe.length > 0) {
    const { data: recipes } = await supabase
      .from('recipe_items')
      .select('product_id, quantity_per_batch, ingredient:ingredients(cost_per_unit)')
      .in('product_id', needsRecipe.map((p) => p.id));

    if (recipes) {
      const costByProduct = new Map<string, number>();
      for (const item of recipes) {
        const ingredient = item.ingredient as unknown as { cost_per_unit: number } | null;
        const lineCost = item.quantity_per_batch * (ingredient?.cost_per_unit || 0);
        costByProduct.set(
          item.product_id,
          (costByProduct.get(item.product_id) || 0) + lineCost
        );
      }
      for (const p of needsRecipe) {
        const batchCost = costByProduct.get(p.id) || 0;
        if (batchCost > 0) {
          result.set(p.id, batchCost / p.batch_size);
        }
      }
    }
  }

  return result;
}

/**
 * Calcula el costo unitario de producción de un paquete sumando
 * el costo de cada producto que lo compone × su cantidad.
 */
export async function getPackageUnitCosts(
  packageIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (packageIds.length === 0) return result;

  const supabase = await createServerClient();

  const { data: items } = await supabase
    .from('package_items')
    .select('package_id, product_id, quantity')
    .in('package_id', packageIds);

  if (!items || items.length === 0) {
    for (const id of packageIds) result.set(id, 0);
    return result;
  }

  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const productCosts = await getProductUnitCosts(productIds);

  for (const id of packageIds) result.set(id, 0);

  for (const item of items) {
    const productCost = productCosts.get(item.product_id) || 0;
    result.set(
      item.package_id,
      (result.get(item.package_id) || 0) + productCost * item.quantity
    );
  }

  return result;
}
