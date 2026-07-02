'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CreateGastoInput, Gasto, OrderWithItems } from '@/types';

function monthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${lastDay}`,
  };
}

export async function getOrdersForMonth(
  year: number,
  month: number
): Promise<OrderWithItems[]> {
  const supabase = await createServerClient();
  const { from, to } = monthRange(year, month);

  // Solo pedidos que Valen aprobó (aprobado en adelante). Quedan afuera los
  // que todavía no revisó (recibido, pendiente), los rechazados y cancelados.
  const APROBADOS = ['approved', 'active', 'in_production', 'ready', 'shipped', 'delivered'];

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', APROBADOS)
    .gte('delivery_date', from)
    .lte('delivery_date', to)
    .order('delivery_date', { ascending: true })
    .order('contact_name', { ascending: true });

  if (error || !orders) return [];

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orders.map((o) => o.id));

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((o) => ({
    ...o,
    cobrado: o.cobrado ?? false,
    fecha_cobro: o.fecha_cobro ?? null,
    forma_pago: o.forma_pago ?? null,
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export async function toggleCobrado(
  orderId: string,
  cobrado: boolean,
  fechaCobro?: string | null,
  formaPago?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('orders')
    .update({
      cobrado,
      fecha_cobro: cobrado ? (fechaCobro ?? null) : null,
      forma_pago: cobrado ? (formaPago ?? null) : null,
    })
    .eq('id', orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/movimientos');
  return { success: true };
}

export async function updatePagoDetails(
  orderId: string,
  fechaCobro: string | null,
  formaPago: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('orders')
    .update({ fecha_cobro: fechaCobro, forma_pago: formaPago })
    .eq('id', orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/movimientos');
  return { success: true };
}

export async function getGastosForMonth(
  year: number,
  month: number
): Promise<Gasto[]> {
  const supabase = await createServerClient();
  const { from, to } = monthRange(year, month);

  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha', { ascending: true });

  if (error || !data) return [];
  return data as Gasto[];
}

export async function createGasto(
  input: CreateGastoInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase.from('gastos').insert({
    fecha: input.fecha,
    categoria: input.categoria,
    proveedor: input.proveedor ?? null,
    monto: input.monto,
    forma_pago: input.forma_pago ?? null,
    nota: input.nota ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/movimientos');
  return { success: true };
}

export async function deleteGasto(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/movimientos');
  return { success: true };
}

export async function updateGasto(
  id: string,
  input: Partial<CreateGastoInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('gastos').update(input).eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/movimientos');
  return { success: true };
}
