'use server';

import { google } from 'googleapis';

const SPREADSHEET_ID = '179ujBmHmdEGZZPxcduu5gqrdSNe_JfOZxE92Xm8u4aQ';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export async function diagnoseSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const maskEmail = (e: string | undefined) =>
    e ? `${e.slice(0, 6)}…${e.slice(-20)}` : '(no seteada)';
  const maskKey = (k: string | undefined) => {
    if (!k) return '(no seteada)';
    const clean = k.replace(/\\n/g, '\n');
    return `${clean.slice(0, 28)}… (${clean.length} chars)`;
  };

  const now = new Date();
  const expectedTab = `Pedidos del Mes-${MESES_ES[now.getMonth()]}`;

  const env = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: maskEmail(email),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: maskKey(rawKey),
    tabQueUsaria: expectedTab,
  };

  if (!email || !rawKey) {
    return { env, error: 'Faltan credenciales de Google en las variables de entorno de Vercel.' };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: rawKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Lee la metadata del spreadsheet (no escribe nada)
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

    const tabs = meta.data.sheets?.map((s) => s.properties?.title ?? '(sin nombre)') ?? [];
    const tabExiste = tabs.includes(expectedTab);

    return {
      env,
      ok: true,
      spreadsheetTitle: meta.data.properties?.title,
      tabs,
      tabExiste,
      tabBuscado: expectedTab,
      mensaje: tabExiste
        ? `✅ El tab "${expectedTab}" existe. Los pedidos deberían cargarse.`
        : `❌ El tab "${expectedTab}" NO existe en el spreadsheet. Verificá el nombre exacto.`,
    };
  } catch (err) {
    return {
      env,
      ok: false,
      error: `Error al conectar con Google Sheets: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
