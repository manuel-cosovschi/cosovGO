'use server';

import { createServerClient } from '@/lib/supabase/server';
import { appendOrderToSheets, getSheetExistingEntries, createNextMonthSheet, listSheetTabs, rebuildMonthSheetFromTemplate } from '@/lib/google-sheets';
import type { Order, OrderItem } from '@/types';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function syncMissingOrdersForMonth(
  year: number,
  month: number
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

    if (!items || items.length === 0) { skipped++; continue; }

    const parts = (order.delivery_date ?? '').split('-');
    const fmtDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';

    const missingItems = (items as OrderItem[]).filter((item) =>
      !existing.has(`${fmtDate}|${order.contact_name}|${item.item_name}`)
    );

    if (missingItems.length === 0) { skipped++; continue; }

    try {
      await appendOrderToSheets(order as Order, missingItems);
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

// Rebuilds a month's tab from the Mayo template and re-syncs all that month's
// orders from the app. Use this to repair a tab that got into a bad state.
export async function rebuildAndResyncMonth(
  year: number,
  month: number
): Promise<{ success: boolean; rebuilt: boolean; inserted: number; skipped: number; errors: string[]; error?: string }> {
  const targetMonthName = MESES_ES[month - 1];

  try {
    await rebuildMonthSheetFromTemplate(targetMonthName, 'Mayo');
  } catch (err) {
    return {
      success: false,
      rebuilt: false,
      inserted: 0,
      skipped: 0,
      errors: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const sync = await syncMissingOrdersForMonth(year, month);
  return {
    success: sync.success,
    rebuilt: true,
    inserted: sync.inserted,
    skipped: sync.skipped,
    errors: sync.errors,
    error: sync.error,
  };
}

// Called from the dashboard to ensure next month's sheet exists when within 7 days of month end.
export async function ensureNextMonthSheetExists(): Promise<{
  created: boolean;
  monthName: string;
  error?: string;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  const nextMonth = month === 11 ? 1 : month + 2; // 1-indexed
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthName = MESES_ES[nextMonth - 1];

  if (daysLeft > 7) {
    return { created: false, monthName: nextMonthName };
  }

  try {
    const tabs = await listSheetTabs();
    const targetTab = `Pedidos del Mes-${nextMonthName}`;

    if (tabs.includes(targetTab)) {
      return { created: false, monthName: nextMonthName };
    }

    await createNextMonthSheet(nextYear, nextMonth);
    return { created: true, monthName: nextMonthName };
  } catch (err) {
    return {
      created: false,
      monthName: nextMonthName,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Manual trigger: create next month's sheet on demand.
export async function manualCreateNextMonthSheet(): Promise<{
  success: boolean;
  monthName: string;
  alreadyExisted?: boolean;
  error?: string;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const nextMonth = month === 11 ? 1 : month + 2;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthName = MESES_ES[nextMonth - 1];

  try {
    const tabs = await listSheetTabs();
    const targetTab = `Pedidos del Mes-${nextMonthName}`;

    if (tabs.includes(targetTab)) {
      return { success: true, monthName: nextMonthName, alreadyExisted: true };
    }

    await createNextMonthSheet(nextYear, nextMonth);
    return { success: true, monthName: nextMonthName };
  } catch (err) {
    return {
      success: false,
      monthName: nextMonthName,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
