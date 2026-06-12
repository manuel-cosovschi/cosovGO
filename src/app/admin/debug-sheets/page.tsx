'use client';

import { useState } from 'react';
import { diagnoseSheets } from '@/actions/sheets-diagnostics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type DiagnoseResult = Awaited<ReturnType<typeof diagnoseSheets>>;

export default function DebugSheetsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await diagnoseSheets();
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Diagnóstico de Google Sheets</h1>
        <p className="mt-1 text-sm text-stone-500">
          Verifica las credenciales, el acceso al spreadsheet y si el tab del mes actual existe.
          No escribe ningún dato.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ejecutar diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={run} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar conexión
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {'mensaje' in result && result.mensaje && (
              <p className={`text-sm font-medium ${result.tabExiste ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.mensaje}
              </p>
            )}
            {'error' in result && result.error && (
              <p className="text-sm font-medium text-red-700">❌ {result.error}</p>
            )}
            <pre className="overflow-auto rounded bg-stone-100 p-4 text-xs leading-relaxed text-stone-800">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
