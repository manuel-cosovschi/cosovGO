'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendOrderToSheets, getSheetExistingEntries, createNextMonthSheet, listSheetTabs, rebuildMonthSheetFromTemplate, rebuildResumenForMonth } from '@/lib/google-sheets';
import type { Order, OrderItem } from '@/types';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Deletes orders (and their items) whose contact_name matches, within a month.
// Used to remove owner test orders so they don't reappear on re-sync.
export async function deleteOrdersByContactName(
  year: number,
  month: number,
  contactName: string
): Promise<{ deleted: number; error?: string }> {
  // Service-role client to bypass RLS (this runs without a user session).
  const supabase = createAdminClient();
  const monthStr = String(month).padStart(2, '0');
  const from = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${monthStr}-${lastDay}`;

  // Match by name; delivery_date may be null for some orders, so don't filter it out.
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, delivery_date')
    .ilike('contact_name', contactName);

  if (error) return { deleted: 0, error: error.message };
  if (!orders || orders.length === 0) return { deleted: 0 };

  const ids = orders
    .filter((o) => {
      const dd = (o as { delivery_date?: string | null }).delivery_date;
      return !dd || (dd >= from && dd <= to);
    })
    .map((o) => o.id);

  if (ids.length === 0) return { deleted: 0 };

  await supabase.from('order_items').delete().in('order_id', ids);
  const { error: delErr } = await supabase.from('orders').delete().in('id', ids);
  if (delErr) return { deleted: 0, error: delErr.message };
  return { deleted: ids.length };
}

// Rebuilds the resumen of a month with live auto formulas, optionally removing
// test orders both from the app DB and the sheet first.
export async function finalizeMonthResumen(
  year: number,
  month: number,
  removeContactNames: string[] = []
): Promise<{ success: boolean; clients?: string[]; total?: number; weeks?: { label: string; total: number }[]; dbDeleted?: number; error?: string }> {
  const tabName = `Pedidos del Mes-${MESES_ES[month - 1]}`;
  try {
    let dbDeleted = 0;
    for (const name of removeContactNames) {
      const r = await deleteOrdersByContactName(year, month, name);
      dbDeleted += r.deleted;
    }
    const res = await rebuildResumenForMonth(tabName, removeContactNames);
    return { success: true, clients: res.clients, total: res.total, weeks: res.weeks, dbDeleted };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

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
