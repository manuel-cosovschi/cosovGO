'use client';

import { useState } from 'react';
import { diagnoseEmail } from '@/actions/email-diagnostics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type DiagnoseResult = Awaited<ReturnType<typeof diagnoseEmail>>;

export default function DebugEmailPage() {
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await diagnoseEmail(to || undefined);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Diagnóstico de email</h1>
        <p className="mt-1 text-sm text-stone-500">
          Verifica la configuración de Brevo y manda un mail de prueba.
          Si falla, mostramos el error exacto que devuelve Brevo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="to">Destinatario (opcional)</Label>
            <Input
              id="to"
              type="email"
              placeholder="Dejar vacío para usar ADMIN_EMAIL"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <p className="text-xs text-stone-400">
              Si no ponés nada, manda a `ADMIN_EMAIL` (el hotmail de Valen).
            </p>
          </div>
          <Button onClick={run} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Probar envío
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-stone-100 p-4 text-xs leading-relaxed text-stone-800">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result && 'ok' in result && result.ok === false && (
              <p className="mt-3 text-sm text-red-700">
                ❌ Envío falló — mirá el campo `body` de arriba para el
                mensaje exacto de Brevo.
              </p>
            )}
            {result && 'ok' in result && result.ok === true && (
              <p className="mt-3 text-sm text-emerald-700">
                ✅ Envío OK — revisá la bandeja de entrada (y la carpeta
                de spam). El `messageId` en `body` confirma que Brevo
                aceptó el mail.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
