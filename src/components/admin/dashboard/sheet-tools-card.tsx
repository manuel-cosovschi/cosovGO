'use client';

import { useState, useEffect } from 'react';
import { syncMissingOrdersForMonth, manualCreateNextMonthSheet, recalcResumenForMonth } from '@/actions/sheet-tools';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Plus, Calculator } from 'lucide-react';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function SheetToolsCard() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const mesActual = MESES_ES[month];
  const nextMonthName = MESES_ES[month === 11 ? 0 : month + 1];

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [resumenLoading, setResumenLoading] = useState(false);
  const [resumenMsg, setResumenMsg] = useState<string | null>(null);

  // Auto-check on mount if we're within 7 days of month end — silently creates next month's sheet
  useEffect(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    if (daysLeft <= 7) {
      // Fire-and-forget: the manual button will show status if needed
      import('@/actions/sheet-tools').then(({ ensureNextMonthSheetExists }) => {
        ensureNextMonthSheetExists().then((r) => {
          if (r.created) {
            setCreateMsg(`✅ Hoja de ${r.monthName} creada automáticamente`);
          }
        }).catch(() => {/* silent */});
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleRecalcResumen = async () => {
    setResumenLoading(true);
    setResumenMsg(null);
    try {
      const r = await recalcResumenForMonth(year, month + 1);
      if (!r.success) {
        setResumenMsg(`❌ ${r.error}`);
      } else {
        setResumenMsg(`✅ Resumen recalculado · ${r.clients?.length ?? 0} clientes · $${(r.total ?? 0).toLocaleString('es-AR')}`);
      }
    } catch (err) {
      setResumenMsg(`❌ ${err instanceof Error ? err.message : 'Error inesperado'}`);
    } finally {
      setResumenLoading(false);
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
        setCreateMsg(`✅ Hoja de ${r.monthName} creada con formato de ${mesActual}`);
      }
    } catch (err) {
      setCreateMsg(`❌ ${err instanceof Error ? err.message : 'Error inesperado'}`);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-6 py-4">
        <h2 className="font-semibold text-stone-900">Google Sheets — {mesActual} {year}</h2>
        <p className="text-xs text-stone-400 mt-0.5">Herramientas para mantener el sheet del mes actualizado</p>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-1.5">
          <Button size="sm" onClick={handleSync} disabled={syncLoading}>
            {syncLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Sincronizar pedidos faltantes
          </Button>
          {syncMsg && <p className="text-xs text-stone-600">{syncMsg}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="outline" onClick={handleRecalcResumen} disabled={resumenLoading}>
            {resumenLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Calculator className="mr-2 h-3.5 w-3.5" />}
            Recalcular resumen
          </Button>
          {resumenMsg && <p className="text-xs text-stone-600">{resumenMsg}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="outline" onClick={handleCreateNextMonth} disabled={createLoading}>
            {createLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            Crear hoja de {nextMonthName}
          </Button>
          {createMsg && <p className="text-xs text-stone-600">{createMsg}</p>}
        </div>
      </div>
    </div>
  );
}
