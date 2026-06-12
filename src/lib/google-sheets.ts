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

export async function appendOrderToSheets(order: Order, orderItems: OrderItem[]): Promise<void> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.warn('[sheets] Credenciales de Google no configuradas, se omite la integración.');
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const deliveryDate = formatDate(order.delivery_date);
  const sheetName = getSheetName(order.delivery_date);

  // Una fila por item del pedido
  const rows = orderItems.map((item) => [
    deliveryDate,
    order.contact_name,
    item.item_name,
    item.quantity,
    item.unit_price,
    item.subtotal,
    'No',
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:G`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}
