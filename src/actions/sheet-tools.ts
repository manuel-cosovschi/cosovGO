'use server';

import { createServerClient } from '@/lib/supabase/server';
import { appendOrderToSheets, getSheetExistingEntries, copySheetFormat } from '@/lib/google-sheets';
import type { Order, OrderItem } from '@/types';

// Copia el formato de la hoja de Mayo a las hojas de los meses indicados
export async function repairSheetFormats(
  targetMonths: string[]
): Promise<{ success: boolean; results: Record<string, string>; error?: string }> {
  const results: Record<string, string> = {};

  for (const month of targetMonths) {
    try {
      await copySheetFormat('Pedidos del Mes-Mayo', `Pedidos del Mes-${month}`);
      results[month] = '✅ Formato aplicado';
    } catch (err) {
      results[month] = `❌ ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return { success: true, results };
}

// Sincroniza todos los pedidos de un mes que no estén en el sheet
export async function syncMissingOrdersForMonth(
  year: number,
  month: number // 1-12
): Promise<{ success: boolean; inserted: number; skipped: number; errors: string[]; error?: string }> {
  const supabase = await createServerClient();

  const monthStr = String(month).padStart(2, '0');
  const from = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${monthStr}-${lastDay}`;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .gte('delivery_date', from)
    .lte('delivery_date', to)
    .order('delivery_date', { ascending: true });

  if (error || !orders) {
    return { success: false, inserted: 0, skipped: 0, errors: [], error: error?.message };
  }

  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const sheetName = `Pedidos del Mes-${MESES_ES[month - 1]}`;

  let existing: Set<string>;
  try {
    existing = await getSheetExistingEntries(sheetName);
  } catch {
    existing = new Set();
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const order of orders) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (!items || items.length === 0) {
      skipped++;
      continue;
    }

    // Filtrar items que ya están en el sheet
    const [d, m, y2] = (order.delivery_date ?? '').split('-');
    const formattedDate = `${y2 ?? ''}/${m ?? ''}/${d ?? ''}`;
    // Reformat: delivery_date is YYYY-MM-DD, formatDate gives DD/MM/YYYY
    const parts = (order.delivery_date ?? '').split('-');
    const fmtDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';

    const missingItems = (items as OrderItem[]).filter((item) => {
      const key = `${fmtDate}|${order.contact_name}|${item.item_name}`;
      return !existing.has(key);
    });

    if (missingItems.length === 0) {
      skipped++;
      continue;
    }

    try {
      await appendOrderToSheets(order as Order, missingItems);
      // Add inserted items to existing set to avoid re-checking
      for (const item of missingItems) {
        existing.add(`${fmtDate}|${order.contact_name}|${item.item_name}`);
      }
      inserted++;
    } catch (err) {
      errors.push(`Pedido ${order.order_number ?? order.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { success: true, inserted, skipped, errors };
}
