import { google } from 'googleapis';
import type { Order, OrderItem } from '@/types';

const SPREADSHEET_ID = '179ujBmHmdEGZZPxcduu5gqrdSNe_JfOZxE92Xm8u4aQ';
const SHEET_NAME = 'Pedidos del Mes';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // "2024-01-15" → "15/01/2024", sin problema de timezone
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

async function getSheetId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<number> {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = res.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`Hoja "${SHEET_NAME}" no encontrada`);
  }
  return sheetId;
}

// Finds the 0-indexed row where new data should be inserted.
// Inserts before the RESUMEN section (or before any empty separator row before it).
async function findInsertionRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:A`,
  });
  const colA = res.data.values || [];

  // Walk from row 4 (index 3) downward
  let lastDataRow = 3; // fallback: insert at row 4
  for (let i = 3; i < colA.length; i++) {
    const cell = String(colA[i]?.[0] ?? '');
    if (cell.toUpperCase().includes('RESUMEN')) {
      // Step back past any empty rows before the RESUMEN section
      let j = i - 1;
      while (j > 3 && !colA[j]?.[0]) j--;
      return j + 1; // insert right after the last data row
    }
    if (cell) lastDataRow = i + 1;
  }
  return lastDataRow;
}

export async function appendOrderToSheets(order: Order, orderItems: OrderItem[]): Promise<void> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.warn('[sheets] Credenciales de Google no configuradas, se omite la integración.');
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const deliveryDate = formatDate(order.delivery_date);
  const rows = orderItems.map((item) => [
    deliveryDate,
    order.contact_name,
    item.item_name,
    item.quantity,
    item.unit_price,
    item.subtotal,
    'No',
  ]);

  const [sheetId, insertIdx] = await Promise.all([
    getSheetId(sheets, SPREADSHEET_ID),
    findInsertionRow(sheets, SPREADSHEET_ID),
  ]);

  // Insert empty rows at the right position (inheriting formatting from above)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: insertIdx,
            endIndex: insertIdx + rows.length,
          },
          inheritFromBefore: true,
        },
      }],
    },
  });

  // Write the data into the newly inserted rows
  const startRow = insertIdx + 1; // Sheets API uses 1-indexed rows in A1 notation
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${startRow}:G${startRow + rows.length - 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}
