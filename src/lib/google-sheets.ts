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

// Rebuilds a month's tab from scratch using a clean template month (default Mayo).
// Deletes the existing (possibly broken) target tab, duplicates the template,
// clears its data rows, renames it, and updates the title. Leaves the sheet with
// the exact format/dropdowns/resumen formulas of the template and NO data rows
// (ready to be re-synced from the app).
export async function rebuildMonthSheetFromTemplate(
  targetMonthName: string,
  templateMonthName = 'Mayo'
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const targetTabName = `Pedidos del Mes-${targetMonthName}`;
  const templateTabName = `Pedidos del Mes-${templateMonthName}`;

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetMap = new Map(
    meta.data.sheets?.map((s) => [s.properties?.title ?? '', s.properties?.sheetId ?? 0])
  );

  const templateId = sheetMap.get(templateTabName);
  if (templateId == null) {
    throw new Error(`Plantilla no encontrada: "${templateTabName}"`);
  }

  // 1. Delete the existing target tab if it exists (removes the broken state entirely)
  const existingTargetId = sheetMap.get(targetTabName);
  if (existingTargetId != null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteSheet: { sheetId: existingTargetId } }] },
    });
  }

  // 2. Duplicate the template tab (copies ALL formatting, validations, dropdowns, formulas)
  const copyRes = await sheets.spreadsheets.sheets.copyTo({
    spreadsheetId: SPREADSHEET_ID,
    sheetId: templateId,
    requestBody: { destinationSpreadsheetId: SPREADSHEET_ID },
  });

  const newSheetId = copyRes.data.sheetId!;
  const copiedTitle = copyRes.data.title ?? `Copy of ${templateTabName}`;

  // 3. Find resumen start row in the copied sheet (identical to template)
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

  // 4. Clear the template's data rows (keeps formatting/dropdowns intact)
  if (resumenStartRow > 4) {
    requests.push({
      updateCells: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 3, // row 4 (0-indexed)
          endRowIndex: resumenStartRow - 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        fields: 'userEnteredValue',
      },
    });
  }

  // 5. Rename the new tab to the target month
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

  // 6. Update the title cell (A1) to the target month
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

export async function readSheetRange(range: string): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return (res.data.values as string[][]) ?? [];
}

function parseMoney(s: string): number {
  if (!s) return 0;
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Computes the Monday–Sunday week bucket for a "DD/MM/YYYY" date string.
function weekBucket(dateStr: string): { key: string; label: string; order: number } | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  const offset = (date.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x: Date) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`;
  return {
    key: monday.toISOString().slice(0, 10),
    label: `${fmt(monday)} - ${fmt(sunday)}`,
    order: monday.getTime(),
  };
}

const MONEY_FORMAT = '"$"#,##0';

// Rebuilds the "RESUMEN" section of a month's tab with LIVE formulas that
// auto-sum every client present in the data (including new ones), plus a weekly
// breakdown with real dates. Optionally deletes data rows for the given clients
// (e.g. test orders) first. Returns a summary of what was built.
export async function rebuildResumenForMonth(
  tabName: string,
  removeClients: string[] = []
): Promise<{ clients: string[]; total: number; resumenStartRow: number; dataEndRow: number; weeks: { label: string; total: number }[] }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === tabName);
  if (!sheet) throw new Error(`Tab no encontrado: ${tabName}`);
  const sheetId = sheet.properties!.sheetId!;

  const readData = async () => {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A4:G`,
    });
    return res.data.values ?? [];
  };

  // 1. Delete data rows whose client matches removeClients (bottom-up to keep indices valid)
  if (removeClients.length) {
    const rows = await readData();
    const removeSet = new Set(removeClients.map((c) => c.toLowerCase().trim()));
    const toDelete: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const a = (rows[i]?.[0] ?? '').toString();
      if (a.toUpperCase().includes('RESUMEN')) break;
      const client = (rows[i]?.[1] ?? '').toString().toLowerCase().trim();
      if (client && removeSet.has(client)) toDelete.push(3 + i); // 0-based row index (row 4 = index 3)
    }
    toDelete.sort((x, y) => y - x);
    if (toDelete.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: toDelete.map((idx) => ({
            deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 } },
          })),
        },
      });
    }
  }

  // 2. Re-read; locate resumen start, distinct clients, weekly buckets, grand total
  const rows = await readData();
  let resumenIdx = rows.length;
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? '').toString().toUpperCase().includes('RESUMEN')) {
      resumenIdx = i;
      break;
    }
  }
  const resumenStartRow = 4 + resumenIdx; // 1-based
  const dataEndRow = resumenStartRow - 1; // formulas reference A4:G{dataEndRow}

  const clientOrder: string[] = [];
  const clientSeen = new Map<string, string>();
  const weekly = new Map<string, { label: string; total: number; order: number }>();
  let total = 0;

  for (let i = 0; i < resumenIdx; i++) {
    const a = (rows[i]?.[0] ?? '').toString().trim();
    const client = (rows[i]?.[1] ?? '').toString().trim();
    const f = parseMoney((rows[i]?.[5] ?? '').toString());
    if (client) {
      const k = client.toLowerCase();
      if (!clientSeen.has(k)) {
        clientSeen.set(k, client);
        clientOrder.push(k);
      }
    }
    if (f) {
      total += f;
      const wk = weekBucket(a);
      if (wk) {
        const e = weekly.get(wk.key) ?? { label: wk.label, total: 0, order: wk.order };
        e.total += f;
        weekly.set(wk.key, e);
      }
    }
  }

  const clients = clientOrder.map((k) => clientSeen.get(k)!);
  const weeks = [...weekly.values()].sort((a, b) => a.order - b.order);

  // 3. Build the resumen rows (values + formulas)
  const DEND = dataEndRow;
  const values: (string | number)[][] = [];

  values.push([`RESUMEN POR CLIENTE`]); // title
  values.push(['Cliente', 'Total pedido', 'Cobrado', 'Pendiente']);
  const firstClientRow = resumenStartRow + values.length; // 1-based row of first client
  clients.forEach((name, i) => {
    const r = firstClientRow + i;
    values.push([
      name,
      `=SUMIF($B$4:$B$${DEND},$A${r},$F$4:$F$${DEND})`,
      `=B${r}-D${r}`,
      `=SUMIFS($F$4:$F$${DEND},$B$4:$B$${DEND},$A${r},$G$4:$G$${DEND},"No")`,
    ]);
  });
  const lastClientRow = firstClientRow + clients.length - 1;
  const totalRow = lastClientRow + 1;
  values.push([
    'TOTAL MES',
    `=SUM(B${firstClientRow}:B${lastClientRow})`,
    `=SUM(C${firstClientRow}:C${lastClientRow})`,
    `=SUM(D${firstClientRow}:D${lastClientRow})`,
  ]);
  values.push([]); // blank

  values.push(['RESUMEN POR SEMANA']);
  values.push(['Semana', 'Total']);
  const firstWeekRow = resumenStartRow + values.length;
  weeks.forEach((w) => values.push([w.label, w.total]));
  const lastWeekRow = firstWeekRow + weeks.length - 1;
  values.push(['TOTAL MES', `=SUM(B${firstWeekRow}:B${lastWeekRow})`]);

  const lastWrittenRow = resumenStartRow + values.length - 1;

  // 4. Clear the old resumen region (values + formats) before writing
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateCells: {
            range: {
              sheetId,
              startRowIndex: resumenStartRow - 1,
              endRowIndex: resumenStartRow - 1 + 80,
              startColumnIndex: 0,
              endColumnIndex: 9,
            },
            fields: 'userEnteredValue,userEnteredFormat',
          },
        },
      ],
    },
  });

  // 5. Write the new resumen values/formulas
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A${resumenStartRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  // 6. Formatting: currency on money columns, bold on titles/headers/totals
  const titleRow0 = resumenStartRow - 1; // 0-based
  const headerRow0 = resumenStartRow; // header is the row after title
  const weekTitleRow0 = firstWeekRow - 2 - 1; // 'RESUMEN POR SEMANA' title (0-based)
  const weekHeaderRow0 = firstWeekRow - 1 - 1; // weekly header (0-based)
  const fmtRequests: object[] = [
    // currency on client B:D
    {
      repeatCell: {
        range: { sheetId, startRowIndex: firstClientRow - 1, endRowIndex: totalRow, startColumnIndex: 1, endColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: MONEY_FORMAT } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // currency on weekly B
    {
      repeatCell: {
        range: { sheetId, startRowIndex: firstWeekRow - 1, endRowIndex: lastWeekRow + 1, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: MONEY_FORMAT } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // bold: client title, client header, client total, week title, week header, week total
    ...[titleRow0, headerRow0, totalRow - 1, weekTitleRow0, weekHeaderRow0, lastWrittenRow - 1].map((r) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: 4 },
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    })),
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: fmtRequests },
  });

  return {
    clients,
    total,
    resumenStartRow,
    dataEndRow,
    weeks: weeks.map((w) => ({ label: w.label, total: w.total })),
  };
}
