import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// === Cantidades: mínimo + venta por múltiplo ===
// Ej: brownies con sale_multiple = 12 → solo se puede pedir 12, 24, 36...
// Un producto con min 10 y múltiplo 1 → 10, 11, 12...

/** El paso del stepper (cuánto suma/resta cada +/-). */
export function quantityStep(saleMultiple?: number | null): number {
  return Math.max(1, Math.floor(saleMultiple || 1));
}

/** La cantidad mínima válida: el múltiplo más chico que cubre el mínimo. */
export function minValidQuantity(
  minQuantity?: number | null,
  saleMultiple?: number | null
): number {
  const step = quantityStep(saleMultiple);
  const min = Math.max(1, Math.floor(minQuantity || 1));
  if (step <= 1) return min;
  return Math.ceil(Math.max(min, step) / step) * step;
}

/** Ajusta una cantidad a un valor válido (respeta mínimo y múltiplo). */
export function normalizeQuantity(
  qty: number,
  minQuantity?: number | null,
  saleMultiple?: number | null
): number {
  const step = quantityStep(saleMultiple);
  const minQ = minValidQuantity(minQuantity, saleMultiple);
  if (!Number.isFinite(qty) || qty <= minQ) return minQ;
  const steps = Math.round((qty - minQ) / step);
  return minQ + Math.max(0, steps) * step;
}

/** Devuelve null si la cantidad es válida, o un mensaje de error si no. */
export function quantityError(
  qty: number,
  minQuantity?: number | null,
  saleMultiple?: number | null,
  unit = 'unidad'
): string | null {
  const step = quantityStep(saleMultiple);
  const minQ = minValidQuantity(minQuantity, saleMultiple);
  if (!Number.isInteger(qty) || qty < minQ) {
    return `El mínimo es ${minQ} ${unit}.`;
  }
  if (step > 1 && qty % step !== 0) {
    return `Se vende de a ${step} ${unit}. Elegí un múltiplo de ${step}.`;
  }
  return null;
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
