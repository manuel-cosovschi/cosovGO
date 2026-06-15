'use client';

import { useState } from 'react';
import { syncMissingOrdersForMonth, manualCreateNextMonthSheet, rebuildAndResyncMonth } from '@/actions/sheet-tools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth(); // 0-indexed

export default function SheetToolsPage() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);

  const handleRebuild = async () => {
    const ok = window.confirm(
      `Esto BORRA la hoja de ${MESES_ES[currentMonth]} actual, la recrea con el formato exacto de Mayo y vuelve a cargar todos los pedidos de ${MESES_ES[currentMonth]} desde la app. ¿Continuar?`
    );
    if (!ok) return;
    setRebuildLoading(true);
    setRebuildMsg(null);
    try {
      const r = await rebuildAndResyncMonth(currentYear, currentMonth + 1);
      if (!r.success) {
        setRebuildMsg(`❌ ${r.error}`);
      } else {
        setRebuildMsg(
          `✅ Hoja de ${MESES_ES[currentMonth]} reconstruida desde Mayo · ${r.inserted} pedido(s) cargado(s)${r.errors.length ? ` · ${r.errors.length} error(es)` : ''}`
        );
      }
    } catch (err) {
      setRebuildMsg(`❌ ${err instanceof Error ? err.message : 'Error inesperado'}`);
    } finally {
      setRebuildLoading(false);
    }
  };

  const handleSyncCurrentMonth = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const r = await syncMissingOrdersForMonth(currentYear, currentMonth + 1);
      setSyncResult({ inserted: r.inserted, skipped: r.skipped, errors: r.errors });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCreateNextMonth = async () => {
    setCreateLoading(true);
    setCreateMsg(null);
    try {
      const r = await manualCreateNextMonthSheet();
      if (!r.success) {
        setCreateMsg(`❌ ${r.error}`);
      } else if (r.alreadyExisted) {
        setCreateMsg(`✅ La hoja de ${r.monthName} ya existe`);
      } else {
        setCreateMsg(`✅ Hoja de ${r.monthName} creada correctamente`);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Herramientas de Google Sheets</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sincronizar pedidos y crear hojas de nuevos meses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sincronizar pedidos faltantes — {MESES_ES[currentMonth]} {currentYear}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-500">
            Busca todos los pedidos del mes actual en la app e inserta los que no estén en el sheet.
            No duplica entradas existentes. Los datos se insertan en la primera fila vacía antes del resumen.
          </p>
          <Button onClick={handleSyncCurrentMonth} disabled={syncLoading}>
            {syncLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sincronizar pedidos de {MESES_ES[currentMonth]} {currentYear}
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

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-base">Reparar hoja de {MESES_ES[currentMonth]} (reconstruir desde Mayo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-500">
            Borra la hoja de {MESES_ES[currentMonth]} y la vuelve a crear con el formato exacto de Mayo
            (colores, dropdowns, fórmulas del resumen). Después carga todos los pedidos de {MESES_ES[currentMonth]}
            desde la app. Usalo si la hoja quedó desordenada o con resúmenes duplicados.
          </p>
          <Button onClick={handleRebuild} disabled={rebuildLoading} variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
            {rebuildLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reparar hoja de {MESES_ES[currentMonth]} {currentYear}
          </Button>
          {rebuildMsg && <p className="text-sm text-stone-600 mt-1">{rebuildMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear hoja del próximo mes — {MESES_ES[currentMonth === 11 ? 0 : currentMonth + 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-500">
            Duplica la hoja del mes actual con el formato exacto (colores, dropdowns, fórmulas del resumen)
            y limpia las filas de datos. El sistema también lo hace automáticamente una semana antes de fin de mes.
          </p>
          <Button onClick={handleCreateNextMonth} disabled={createLoading} variant="outline">
            {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear hoja de {MESES_ES[currentMonth === 11 ? 0 : currentMonth + 1]}
          </Button>
          {createMsg && <p className="text-sm text-stone-600 mt-1">{createMsg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
