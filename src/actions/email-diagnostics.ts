'use server';

// Diagnóstico de email — herramienta temporal para debuggear la integración
// con Brevo. Devuelve al UI la presencia/forma de las env vars y el resultado
// exacto del intento de envío (incluyendo el cuerpo de error de Brevo).
// No loguea la API key completa; sólo prefijo/sufijo para identificarla.

export async function diagnoseEmail(toOverride?: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  const fromName = process.env.FROM_NAME || 'COSOV.';
  const adminEmail = process.env.ADMIN_EMAIL;

  const maskKey = (k: string | undefined) => {
    if (!k) return '(no seteada)';
    if (k.length < 12) return `(muy corta: ${k.length} chars)`;
    return `${k.slice(0, 10)}…${k.slice(-4)}  (${k.length} chars)`;
  };

  const env = {
    BREVO_API_KEY: maskKey(apiKey),
    FROM_EMAIL: fromEmail || '(no seteada)',
    FROM_NAME: fromName,
    ADMIN_EMAIL: adminEmail || '(no seteada)',
  };

  const to = toOverride || adminEmail || fromEmail;
  if (!apiKey) {
    return { env, attempt: null, error: 'BREVO_API_KEY no está seteada en Vercel.' };
  }
  if (!fromEmail) {
    return { env, attempt: null, error: 'FROM_EMAIL no está seteada en Vercel.' };
  }
  if (!to) {
    return { env, attempt: null, error: 'No hay destinatario (seteá ADMIN_EMAIL o pasá uno).' };
  }

  const attempt = { to, fromEmail, fromName };

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
        subject: 'Test COSOV. — diagnóstico',
        textContent:
          'Este es un mail de prueba generado desde el admin de COSOV. ' +
          'Si recibiste esto, la integración con Brevo funciona correctamente.',
      }),
    });

    const bodyText = await res.text().catch(() => '<no body>');
    let bodyJson: unknown = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      /* keep as text */
    }

    return {
      env,
      attempt,
      status: res.status,
      ok: res.ok,
      body: bodyJson ?? bodyText,
      error: res.ok ? null : `Brevo respondió ${res.status}`,
    };
  } catch (err) {
    return {
      env,
      attempt,
      error: `Fetch falló: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
