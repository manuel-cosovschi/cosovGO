/**
 * Canal de venta: a quién le estamos vendiendo.
 *
 * La página tiene dos catálogos con links distintos:
 *   /catalogo -> mayorista (cafeterías)
 *   /tienda   -> minorista (particulares)
 *
 * Cada producto puede tener precio y mínimos propios en cada uno. Toda esa
 * regla vive acá, en un solo lugar, así ni el catálogo ni el carrito ni la
 * creación del pedido tienen que saber de columnas distintas.
 */

import type { Product } from '@/types';

export type Canal = 'mayorista' | 'minorista';

export const CANALES: Canal[] = ['mayorista', 'minorista'];

export const CANAL_LABELS: Record<Canal, string> = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
};

/** Ruta base del catálogo de cada canal. */
export const CANAL_BASE_PATH: Record<Canal, string> = {
  mayorista: '/catalogo',
  minorista: '/tienda',
};

export function isCanal(value: unknown): value is Canal {
  return value === 'mayorista' || value === 'minorista';
}

/** Precio del producto en un canal. `null` si no se vende en ese canal. */
export function precioEnCanal(product: Product, canal: Canal): number | null {
  if (canal === 'mayorista') return product.price;
  return product.price_minorista ?? null;
}

/** Cantidad mínima y múltiplo de venta que rigen en un canal. */
export function cantidadesEnCanal(
  product: Product,
  canal: Canal
): { min_quantity: number; sale_multiple: number } {
  if (canal === 'mayorista') {
    return {
      min_quantity: product.min_quantity ?? 1,
      sale_multiple: product.sale_multiple ?? 1,
    };
  }
  return {
    min_quantity: product.min_quantity_minorista ?? 1,
    sale_multiple: product.sale_multiple_minorista ?? 1,
  };
}

/**
 * ¿Se muestra este producto en el catálogo del canal?
 *
 * En minorista se exige precio cargado: si Valen todavía no le puso precio de
 * particular, no aparece. Es a propósito — evita que alguien compre a precio
 * de cafetería por un olvido.
 */
export function visibleEnCanal(product: Product, canal: Canal): boolean {
  if (!product.is_active) return false;
  if (canal === 'mayorista') return product.visible_mayorista !== false;
  return product.visible_minorista !== false && product.price_minorista != null;
}

/**
 * Devuelve el producto con `price`, `min_quantity` y `sale_multiple` ya
 * reemplazados por los del canal.
 *
 * Así las tarjetas, la ficha y el carrito siguen leyendo `product.price` sin
 * enterarse de que existen dos listas de precios.
 */
export function productoParaCanal(product: Product, canal: Canal): Product {
  const precio = precioEnCanal(product, canal);
  const { min_quantity, sale_multiple } = cantidadesEnCanal(product, canal);

  return {
    ...product,
    price: precio ?? product.price,
    min_quantity,
    sale_multiple,
  };
}
