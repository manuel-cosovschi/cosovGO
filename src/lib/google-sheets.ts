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

  // Empieza desde fila 4 (después de título, instrucciones y headers de Valen)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A4:G`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
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
    if (date && client && product) {
      existing.add(`${date}|${client}|${product}`);
    }
  }
  return existing;
}

export async function copySheetFormat(sourceTabName: string, targetTabName: string): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetMap = new Map(
    meta.data.sheets?.map((s) => [s.properties?.title ?? '', s.properties?.sheetId ?? 0])
  );

  const sourceId = sheetMap.get(sourceTabName);
  const targetId = sheetMap.get(targetTabName);

  if (sourceId == null || targetId == null) {
    throw new Error(`Tab no encontrado: "${sourceTabName}" o "${targetTabName}"`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          copyPaste: {
            source: { sheetId: sourceId, startRowIndex: 0, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: 10 },
            destination: { sheetId: targetId, startRowIndex: 0, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: 10 },
            pasteType: 'PASTE_FORMAT',
          },
        },
      ],
    },
  });
}
