import { google } from 'googleapis';
import type { Order, OrderItem } from '@/types';

const SPREADSHEET_ID = '179ujBmHmdEGZZPxcduu5gqrdSNe_JfOZxE92Xm8u4aQ';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getSheetName(dateStr: string | null | undefined): string {
  if (!dateStr) {
    const now = new Date();
    return `Pedidos del Mes-${MESES_ES[now.getMonth()]}`;
  }
  const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
  return `Pedidos del Mes-${MESES_ES[monthIndex]}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// Finds the first truly empty row in the data section (starting from row 4),
// stopping before the resumen section. Returns 1-based row number.
async function findFirstEmptyDataRow(sheets: ReturnType<typeof google.sheets>, sheetName: string): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A4:B`,
  });

  const rows = res.data.values ?? [];
  for (let i = 0; i < rows.length; i++) {
    const cellA = (rows[i]?.[0] ?? '').toString().trim();
    const cellB = (rows[i]?.[1] ?? '').toString().trim();

    // Stop at resumen section marker
    if (cellA.toUpperCase().includes('RESUMEN') || cellB.toUpperCase().includes('RESUMEN')) {
      return 4 + i;
    }
    // Empty row in data section = first available slot
    if (!cellA && !cellB) {
      return 4 + i;
    }
  }

  // All scanned rows are data — next row after the last
  return 4 + rows.length;
}

export async function appendOrderToSheets(order: Order, orderItems: OrderItem[]): Promise<void> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.warn('[sheets] Credenciales de Google no configuradas, se omite la integración.');
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const deliveryDate = formatDate(order.delivery_date);
  const sheetName = getSheetName(order.delivery_date);

  const rows = orderItems.map((item) => [
    deliveryDate,
    order.contact_name,
    item.item_name,
    item.quantity,
    item.unit_price,
    item.subtotal,
    'No',
  ]);

  const startRow = await findFirstEmptyDataRow(sheets, sheetName);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${startRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

export async function getSheetExistingEntries(sheetName: string): Promise<Set<string>> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A4:C`,
  });

  const existing = new Set<string>();
  for (const row of res.data.values ?? []) {
    const date = row[0] ?? '';
    const client = row[1] ?? '';
    const product = row[2] ?? '';
    // Stop collecting keys once we hit the resumen section
    if (
      date.toString().toUpperCase().includes('RESUMEN') ||
      client.toString().toUpperCase().includes('RESUMEN')
    ) {
      break;
    }
    if (date && client && product) {
      existing.add(`${date}|${client}|${product}`);
    }
  }
  return existing;
}

// Duplicates the previous month's sheet tab for the upcoming month.
// Clears data rows (4 to resumen-start), updates the title cell, renames the tab.
export async function createNextMonthSheet(targetYear: number, targetMonth: number): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const targetMonthName = MESES_ES[targetMonth - 1];
  const targetTabName = `Pedidos del Mes-${targetMonthName}`;

  // Source = previous month
  const srcYear = targetMonth === 1 ? targetYear - 1 : targetYear;
  const srcMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const srcMonthName = MESES_ES[srcMonth - 1];
  const srcTabName = `Pedidos del Mes-${srcMonthName}`;

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetMap = new Map(
    meta.data.sheets?.map((s) => [s.properties?.title ?? '', s.properties?.sheetId ?? 0])
  );

  // If target already exists, skip
  if (sheetMap.has(targetTabName)) {
    return;
  }

  const srcId = sheetMap.get(srcTabName);
  if (srcId == null) {
    throw new Error(`Tab de origen no encontrado: "${srcTabName}"`);
  }

  // 1. Duplicate the source tab (copies ALL formatting, validations, dropdowns, formulas)
  const copyRes = await sheets.spreadsheets.sheets.copyTo({
    spreadsheetId: SPREADSHEET_ID,
    sheetId: srcId,
    requestBody: { destinationSpreadsheetId: SPREADSHEET_ID },
  });

  const newSheetId = copyRes.data.sheetId!;
  const copiedTitle = copyRes.data.title ?? `Copy of ${srcTabName}`;

  // 2. Find resumen start row in the new (copied) sheet — read from source since they're identical
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${copiedTitle}!A4:A`,
  });

  let resumenStartRow = -1;
  const dataRows = dataRes.data.values ?? [];
  for (let i = 0; i < dataRows.length; i++) {
    const cell = (dataRows[i]?.[0] ?? '').toString().trim();
    if (cell.toUpperCase().includes('RESUMEN')) {
      resumenStartRow = 4 + i;
      break;
    }
  }

  const requests: object[] = [];

  // 3. Clear data rows (rows 4 to resumen start - 1, or row 4 to end of data if no resumen found)
  if (resumenStartRow > 4) {
    // Delete values in A4:I(resumenStartRow-1) — keeps formatting/dropdowns intact
    requests.push({
      updateCells: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 3,       // row 4 (0-indexed)
          endRowIndex: resumenStartRow - 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        fields: 'userEnteredValue',
      },
    });
  }

  // 4. Rename tab
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: newSheetId, title: targetTabName },
      fields: 'title',
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  // 5. Update the title cell (A1) from "COSOV — [PREV MONTH]" to "COSOV — [TARGET MONTH]"
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${targetTabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[`COSOV — ${targetMonthName.toUpperCase()}`]] },
  });
}

export async function listSheetTabs(): Promise<string[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return meta.data.sheets?.map((s) => s.properties?.title ?? '') ?? [];
}
