import { NextResponse } from 'next/server';

// Temporary diagnostic endpoint — remove after debugging email issues.
// Protected by SYNC_SECRET env var (same token used for the sheet sync endpoint).
export async function GET(req: Request) {
  const secret = process.env.SYNC_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  const fromName = process.env.FROM_NAME || 'COSOV.';
  const adminEmail = process.env.ADMIN_EMAIL;

  const mask = (v: string | undefined) => {
    if (!v) return '(no seteada)';
    if (v.length < 12) return `(corta: ${v.length} chars)`;
    return `${v.slice(0, 8)}…${v.slice(-4)} (${v.length} chars)`;
  };

  const env = {
    BREVO_API_KEY: mask(apiKey),
    FROM_EMAIL: fromEmail ?? '(no seteada)',
    FROM_NAME: fromName,
    ADMIN_EMAIL: adminEmail ?? '(no seteada — usa default hotmail)',
  };

  if (!apiKey || !fromEmail) {
    return NextResponse.json({ env, error: 'Env vars faltantes — Brevo no puede enviar.' });
  }

  const to = adminEmail || fromEmail;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject: 'COSOV. — test de diagnóstico de email',
        textContent:
          'Este mail fue enviado desde el endpoint de diagnóstico de COSOV. ' +
          'Si lo recibís, la integración con Brevo funciona. Revisá también la carpeta de spam.',
      }),
    });

    const bodyText = await res.text().catch(() => '<no body>');
    let bodyJson: unknown = null;
    try { bodyJson = JSON.parse(bodyText); } catch { /* keep as text */ }

    return NextResponse.json({
      env,
      to,
      brevo_status: res.status,
      brevo_ok: res.ok,
      brevo_response: bodyJson ?? bodyText,
    });
  } catch (err) {
    return NextResponse.json({
      env,
      to,
      error: `fetch falló: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
