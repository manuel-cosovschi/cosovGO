// Ruta temporal de backfill: sincroniza al sheet los pedidos que están en DB
// pero todavía no aparecen ahí. Borrar este archivo después de usarlo.
import { createAdminClient } from '@/lib/supabase/admin';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SECRET = 'fd37d4490521ec1c5f1476ec7bfd2587366a712260c7f188';
const SPREADSHEET_ID = '179ujBmHmdEGZZPxcduu5gqrdSNe_JfOZxE92Xm8u4aQ';
const SHEET_NAME = 'Pedidos del Mes';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function normalizeName(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function findInsertionRow(sheets: ReturnType<typeof getSheets>): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const colA = res.data.values || [];
  let lastDataRow = 3;
  for (let i = 3; i < colA.length; i++) {
    const cell = String(colA[i]?.[0] ?? '');
    if (cell.toUpperCase().includes('RESUMEN')) {
      let j = i - 1;
      while (j > 3 && !colA[j]?.[0]) j--;
      return j + 1;
    }
    if (cell) lastDataRow = i + 1;
  }
  return lastDataRow;
}

async function getSheetId(sheets: ReturnType<typeof getSheets>): Promise<number> {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = res.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
  const id = sheet?.properties?.sheetId;
  if (id == null) throw new Error('Hoja no encontrada');
  return id;
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Traer TODOS los pedidos (incluso cancelados/rechazados) para diagnóstico
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, order_number, contact_name, delivery_date, status, created_at, order_items(item_name, quantity, unit_price, subtotal)')
    .order('order_number', { ascending: true });

  if (ordersErr || !orders) {
    return NextResponse.json({ error: 'DB error', details: ordersErr?.message }, { status: 500 });
  }

  // 2. Leer el sheet actual para saber qué ya está
  const sheets = getSheets();
  const sheetRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
  });
  const sheetRows = sheetRes.data.values || [];

  // Set de keys ya presentes: "date|client|product|qty"
  const existingKeys = new Set<string>();
  for (const row of sheetRows) {
    if (row.length >= 4) {
      const key = `${row[0]}|${normalizeName(row[1])}|${normalizeName(row[2])}|${row[3]}`;
      existingKeys.add(key);
    }
  }

  // 3. Diagnóstico: clasificar cada pedido
  type OrderRow = { id: string; order_number: number; contact_name: string; delivery_date: string; status: string; created_at: string; order_items: Array<{ item_name: string; quantity: number; unit_price: number; subtotal: number }> };
  const diagnostic: Array<{ order_number: number; client: string; date: string; status: string; items: number; in_sheet: boolean; created_at: string }> = [];
  const missing: OrderRow[] = [];

  for (const order of orders as OrderRow[]) {
    const items = order.order_items || [];
    const date = formatDate(order.delivery_date);
    const client = normalizeName(order.contact_name);
    const itemKeys = items.map(it => `${date}|${client}|${normalizeName(it.item_name)}|${it.quantity}`);
    const itemsInSheet = itemKeys.map(k => existingKeys.has(k));
    const inSheet = items.length > 0 && itemsInSheet.every(Boolean);

    diagnostic.push({
      order_number: order.order_number,
      client: order.contact_name,
      date: order.delivery_date,
      status: order.status,
      items: items.length,
      in_sheet: inSheet,
      created_at: order.created_at,
      // debug
      item_keys: itemKeys,
      items_in_sheet: itemsInSheet,
    } as never);

    if (!inSheet && items.length > 0 && order.status !== 'cancelled' && order.status !== 'rejected') {
      missing.push(order);
    }
  }

  // 4. Insertar los faltantes (uno por uno, antes del RESUMEN)
  const sheetId = await getSheetId(sheets);
  const results: Array<{ order_number: number; rows: number; status: string; error?: string }> = [];

  for (const order of missing) {
    try {
      const items = order.order_items || [];
      const rows = items.map(it => [
        formatDate(order.delivery_date),
        order.contact_name,
        it.item_name,
        it.quantity,
        it.unit_price,
        it.subtotal,
        'No',
      ]);

      const insertIdx = await findInsertionRow(sheets);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            insertDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: insertIdx, endIndex: insertIdx + rows.length },
              inheritFromBefore: true,
            },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${insertIdx + 1}:G${insertIdx + rows.length}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });

      results.push({ order_number: order.order_number, rows: rows.length, status: 'added' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ order_number: order.order_number, rows: 0, status: 'failed', error: msg });
    }
  }

  return NextResponse.json({
    total_orders: orders.length,
    missing_count: missing.length,
    sheet_rows_sample: sheetRows.slice(0, 5),
    existing_keys_count: existingKeys.size,
    existing_keys_sample: Array.from(existingKeys).slice(0, 5),
    diagnostic,
    results,
  });
}
