'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGasto, deleteGasto } from '@/actions/movimientos';
import type { Gasto } from '@/types';
import { GASTO_CATEGORIAS } from '@/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function weekLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + mondayOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt2 = (dt: Date) => `${dt.getDate()}/${dt.getMonth() + 1}`;
  return `${fmt2(mon)} - ${fmt2(sun)}`;
}

interface WeekGroup {
  label: string;
  startDate: string;
  gastosItems: Gasto[];
  byCategoria: Map<string, number>;
  total: number;
}

function buildWeekGroups(gastos: Gasto[]): WeekGroup[] {
  const groups = new Map<string, WeekGroup>();

  for (const g of gastos) {
    const d = new Date(g.fecha + 'T12:00:00');
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + mondayOffset);
    const key = mon.toISOString().slice(0, 10);
    const label = weekLabel(g.fecha);

    const group = groups.get(key) ?? { label, startDate: key, gastosItems: [] as Gasto[], byCategoria: new Map<string, number>(), total: 0 };
    group.gastosItems.push(g);
    group.total += g.monto;
    group.byCategoria.set(g.categoria, (group.byCategoria.get(g.categoria) ?? 0) + g.monto);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function NuevoGastoForm({
  year,
  month,
  onClose,
}: {
  year: number;
  month: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${year}-${pad(month)}-${pad(new Date().getDate())}`;

  const [fecha, setFecha] = useState(today);
  const [categoria, setCategoria] = useState('Materia prima');
  const [proveedor, setProveedor] = useState('');
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto.replace(/[.,]/g, (m) => (m === '.' ? '.' : '')));
    if (!fecha || !categoria || isNaN(montoNum) || montoNum <= 0) {
      setError('Completá fecha, categoría y monto');
      return;
    }
    setError('');
    startTransition(async () => {
      const r = await createGasto({
        fecha,
        categoria,
        proveedor: proveedor || undefined,
        monto: montoNum,
        forma_pago: formaPago || undefined,
        nota: nota || undefined,
      });
      if (r.success) {
        router.refresh();
        onClose();
      } else {
        setError(r.error ?? 'Error al guardar');
      }
    });
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-900 text-sm">Nuevo gasto</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Categoría *</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          >
            {GASTO_CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Monto *</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Proveedor / Quién</label>
          <input
            type="text"
            placeholder="Ej: Leo, Candela..."
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Forma de pago</label>
          <input
            type="text"
            placeholder="Ej: Santander, Efectivo..."
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Nota</label>
          <input
            type="text"
            placeholder="Descripción opcional"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        {error && (
          <p className="col-span-full text-xs text-red-600">{error}</p>
        )}
        <div className="col-span-full flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Guardar gasto
          </Button>
        </div>
      </form>
    </div>
  );
}

interface Props {
  gastos: Gasto[];
  year: number;
  month: number;
}

export function GastosTab({ gastos, year, month }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const weekGroups = buildWeekGroups(gastos);

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteGasto(id);
      setDeletingId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar gasto
        </Button>
      </div>

      {showForm && (
        <NuevoGastoForm year={year} month={month} onClose={() => setShowForm(false)} />
      )}

      {gastos.length === 0 && !showForm ? (
        <div className="rounded-lg border border-stone-200 bg-white p-12 text-center text-stone-400 text-sm">
          No hay gastos registrados en este mes
        </div>
      ) : (
        <>
          {/* Main table */}
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Categoría</th>
                    <th className="px-4 py-3 text-left">Proveedor / Quién</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Monto</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Forma de pago</th>
                    <th className="px-4 py-3 text-left">Nota</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {gastos.map((g) => (
                    <tr key={g.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-stone-700 font-medium">
                        {fmtDate(g.fecha)}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                          {g.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-stone-600">{g.proveedor ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-medium text-stone-900 whitespace-nowrap">
                        {fmt(g.monto)}
                      </td>
                      <td className="px-4 py-2 text-stone-500 text-xs">{g.forma_pago ?? '—'}</td>
                      <td className="px-4 py-2 text-stone-500 text-xs">{g.nota ?? ''}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDelete(g.id)}
                          disabled={deletingId === g.id}
                          className="text-stone-300 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingId === g.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total row */}
            <div className="border-t-2 border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-stone-700">TOTAL GASTOS</span>
              <span className="font-bold text-stone-900 text-base">{fmt(totalGastos)}</span>
            </div>
          </div>

          {/* Weekly subtotals */}
          {weekGroups.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
              <div className="border-b border-stone-200 bg-stone-50 px-4 py-2">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Subtotales por semana y categoría
                </h3>
              </div>
              <div className="divide-y divide-stone-100">
                {weekGroups.map((wg) => (
                  <div key={wg.startDate} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-stone-800">
                        Semana {wg.label}
                      </span>
                      <span className="text-sm font-bold text-stone-900">{fmt(wg.total)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 sm:grid-cols-3">
                      {[...wg.byCategoria.entries()].map(([cat, monto]) => (
                        <div key={cat} className="flex justify-between text-xs text-stone-500">
                          <span>{cat}</span>
                          <span className="font-medium text-stone-700">{fmt(monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
