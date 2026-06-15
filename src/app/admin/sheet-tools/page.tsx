'use client';

import { useState } from 'react';
import { repairSheetFormats, syncMissingOrdersForMonth } from '@/actions/sheet-tools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SheetToolsPage() {
  const [formatLoading, setFormatLoading] = useState(false);
  const [formatResult, setFormatResult] = useState<Record<string, string> | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);

  const handleRepairFormat = async () => {
    setFormatLoading(true);
    setFormatResult(null);
    try {
      const r = await repairSheetFormats(['Junio', 'Julio']);
      setFormatResult(r.results);
    } finally {
      setFormatLoading(false);
    }
  };

  const handleSyncJune = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const r = await syncMissingOrdersForMonth(2026, 6);
      setSyncResult({ inserted: r.inserted, skipped: r.skipped, errors: r.errors });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Herramientas de Google Sheets</h1>
        <p className="mt-1 text-sm text-stone-500">
          Reparar formato y sincronizar pedidos faltantes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Reparar formato de Junio y Julio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-500">
            Copia el formato visual de Mayo (colores, fuentes, formato de moneda) a Junio y Julio.
            No modifica los datos existentes.
          </p>
          <Button onClick={handleRepairFormat} disabled={formatLoading} variant="outline">
            {formatLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Copiar formato Mayo → Junio y Julio
          </Button>
          {formatResult && (
            <div className="space-y-1">
              {Object.entries(formatResult).map(([month, status]) => (
                <p key={month} className="text-sm">{month}: {status}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Sincronizar pedidos faltantes de Junio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-500">
            Busca todos los pedidos de Junio 2026 en la app e inserta los que no estén en el sheet.
            No duplica entradas existentes.
          </p>
          <Button onClick={handleSyncJune} disabled={syncLoading}>
            {syncLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sincronizar pedidos de Junio 2026
          </Button>
          {syncResult && (
            <div className="space-y-1 text-sm">
              <p className="text-emerald-700 font-medium">✅ Insertados: {syncResult.inserted} pedidos</p>
              <p className="text-stone-500">Ya estaban en el sheet: {syncResult.skipped}</p>
              {syncResult.errors.length > 0 && (
                <div>
                  <p className="text-red-700 font-medium">Errores:</p>
                  {syncResult.errors.map((e, i) => (
                    <p key={i} className="text-red-600 text-xs">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
