'use server';

// Diagnóstico de email desde /admin/debug-email.
//
// Devuelve qué variables están cargadas y el resultado exacto del intento de
// envío, con el cuerpo del error de Resend incluido. Sirve para el caso más
// común y más difícil de adivinar desde afuera: el dominio de MAIL_FROM no
// está verificado, y Resend rechaza con un mensaje que sólo se ve acá.
//
// La API key nunca se devuelve entera: sólo prefijo y sufijo para poder
// identificar cuál está cargada.

export async function diagnoseEmail(toOverride?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;

  const maskKey = (k: string | undefined) => {
    if (!k) return '(no seteada)';
    if (k.length < 12) return `(muy corta: ${k.length} chars)`;
    return `${k.slice(0, 10)}…${k.slice(-4)}  (${k.length} chars)`;
  };

  const env = {
    RESEND_API_KEY: maskKey(apiKey),
    MAIL_FROM: mailFrom || '(no seteada)',
    ADMIN_EMAIL: adminEmail || '(no seteada)',
  };

  const to = toOverride || adminEmail;
  if (!apiKey) {
    return { env, attempt: null, error: 'RESEND_API_KEY no está seteada en Vercel.' };
  }
  if (!mailFrom) {
    return {
      env,
      attempt: null,
      error: 'MAIL_FROM no está seteada en Vercel. Ejemplo: COSOV. <pedidos@tudominio.com>',
    };
  }
  if (!to) {
    return { env, attempt: null, error: 'No hay destinatario (seteá ADMIN_EMAIL o pasá uno).' };
  }

  const attempt = { to, from: mailFrom };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: mailFrom,
        to: [to],
        subject: 'Test COSOV. — diagnóstico',
        text:
          'Este es un mail de prueba generado desde el admin de COSOV. ' +
          'Si recibiste esto, el envío por Resend funciona correctamente.',
      }),
    });

    const bodyText = await res.text().catch(() => '<no body>');
    let bodyJson: unknown = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      /* se deja como texto */
    }

    return {
      env,
      attempt,
      status: res.status,
      ok: res.ok,
      body: bodyJson ?? bodyText,
      error: res.ok ? null : `Resend respondió ${res.status}`,
    };
  } catch (err) {
    return {
      env,
      attempt,
      error: `Fetch falló: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
