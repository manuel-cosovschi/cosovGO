'use client';

import { useState } from 'react';
import { repairSheetFormats, syncMissingOrdersForMonth } from '@/actions/sheet-tools';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Sheet } from 'lucide-react';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function SheetToolsCard() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const mesActual = MESES_ES[month];

  const [formatLoading, setFormatLoading] = useState(false);
  const [formatMsg, setFormatMsg] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const handleRepairFormat = async () => {
    setFormatLoading(true);
    setFormatMsg(null);
    try {
      const r = await repairSheetFormats([mesActual]);
      const result = r.results[mesActual] ?? '?';
      setFormatMsg(result);
    } catch (err) {
      setFormatMsg(`❌ ${err instanceof Error ? err.message : 'Error inesperado'}`);
    } finally {
      setFormatLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const r = await syncMissingOrdersForMonth(year, month + 1);
      if (!r.success) {
        setSyncMsg(`❌ ${r.error}`);
      } else if (r.inserted === 0) {
        setSyncMsg(`✅ Todo ya estaba sincronizado (${r.skipped} pedidos)`);
      } else {
        setSyncMsg(`✅ ${r.inserted} pedido(s) sincronizado(s)${r.skipped ? `, ${r.skipped} ya estaban` : ''}${r.errors.length ? ` · ${r.errors.length} error(es)` : ''}`);
      }
    } catch (err) {
      setSyncMsg(`❌ ${err instanceof Error ? err.message : 'Error inesperado'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-6 py-4">
        <h2 className="font-semibold text-stone-900">Google Sheets — {mesActual} {year}</h2>
        <p className="text-xs text-stone-400 mt-0.5">Herramientas para mantener el sheet del mes actualizado</p>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="outline" onClick={handleRepairFormat} disabled={formatLoading}>
            {formatLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sheet className="mr-2 h-3.5 w-3.5" />}
            Replicar formato de Mayo
          </Button>
          {formatMsg && <p className="text-xs text-stone-600">{formatMsg}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button size="sm" onClick={handleSync} disabled={syncLoading}>
            {syncLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Sincronizar pedidos faltantes
          </Button>
          {syncMsg && <p className="text-xs text-stone-600">{syncMsg}</p>}
        </div>
      </div>
    </div>
  );
}
