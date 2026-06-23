'use client';

import type { Gasto, OrderWithItems } from '@/types';
import { cn } from '@/lib/utils';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const pct = (num: number, den: number) =>
  den === 0 ? '—' : Math.round((num / den) * 100) + '%';

function weekBucket(iso: string | null): { key: string; label: string; order: number } | null {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + mondayOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const f = (dt: Date) => `${dt.getDate()}/${dt.getMonth() + 1}`;
  const key = mon.toISOString().slice(0, 10);
  return { key, label: `${f(mon)} - ${f(sun)}`, order: mon.getTime() };
}

interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'green' | 'red' | 'amber';
}

function KpiCard({ label, value, sub, highlight }: KpiCard) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold',
          highlight === 'green' && 'text-emerald-700',
          highlight === 'red' && 'text-red-600',
          highlight === 'amber' && 'text-amber-700',
          !highlight && 'text-stone-900'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-stone-400">{sub}</p>}
    </div>
  );
}

interface Props {
  orders: OrderWithItems[];
  gastos: Gasto[];
  year: number;
  month: number;
}

export function ResumenTab({ orders, gastos, year, month }: Props) {
  const mesLabel = `${MESES[month - 1]} ${year}`;

  // — Totales generales —
  const totalVendido = orders.reduce((s, o) => s + o.subtotal, 0);
  const totalCobrado = orders.filter((o) => o.cobrado).reduce((s, o) => s + o.subtotal, 0);
  const totalPendiente = totalVendido - totalCobrado;
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const ganancia = totalVendido - totalGastos;

  // — Por cliente —
  const clientMap = new Map<string, { vendido: number; cobrado: number }>();
  for (const o of orders) {
    const key = o.contact_name.trim();
    const cur = clientMap.get(key) ?? { vendido: 0, cobrado: 0 };
    cur.vendido += o.subtotal;
    if (o.cobrado) cur.cobrado += o.subtotal;
    clientMap.set(key, cur);
  }
  const clientRows = [...clientMap.entries()]
    .map(([name, v]) => ({ name, vendido: v.vendido, cobrado: v.cobrado, pendiente: v.vendido - v.cobrado }))
    .sort((a, b) => b.vendido - a.vendido);

  // — Por producto —
  const prodMap = new Map<string, { units: number; total: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.item_name.trim();
      const cur = prodMap.get(key) ?? { units: 0, total: 0 };
      cur.units += item.quantity;
      cur.total += item.subtotal;
      prodMap.set(key, cur);
    }
  }
  const prodRows = [...prodMap.entries()]
    .map(([name, v]) => ({ name, units: v.units, total: v.total }))
    .sort((a, b) => b.total - a.total);

  // — Por semana —
  const weekMap = new Map<string, { label: string; order: number; vendido: number; cobrado: number }>();
  for (const o of orders) {
    const wk = weekBucket(o.delivery_date);
    const key = wk ? wk.key : 'zzz-sin-fecha';
    const label = wk ? wk.label : 'Sin fecha';
    const ord = wk ? wk.order : Number.MAX_SAFE_INTEGER;
    const cur = weekMap.get(key) ?? { label, order: ord, vendido: 0, cobrado: 0 };
    cur.vendido += o.subtotal;
    if (o.cobrado) cur.cobrado += o.subtotal;
    weekMap.set(key, cur);
  }
  const weekRows = [...weekMap.values()].sort((a, b) => a.order - b.order);

  // — Gastos por categoría —
  const catMap = new Map<string, number>();
  for (const g of gastos) {
    catMap.set(g.categoria, (catMap.get(g.categoria) ?? 0) + g.monto);
  }
  const catRows = [...catMap.entries()]
    .map(([cat, monto]) => ({ cat, monto }))
    .sort((a, b) => b.monto - a.monto);

  return (
    <div className="space-y-6">
      {/* 1. Foto general */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wide">
          Foto general — {mesLabel}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total vendido" value={fmt(totalVendido)} />
          <KpiCard label="Cobrado" value={fmt(totalCobrado)} highlight="green" />
          <KpiCard
            label="Pendiente"
            value={fmt(totalPendiente)}
            highlight={totalPendiente > 0 ? 'amber' : undefined}
          />
          <KpiCard label="Total gastos" value={fmt(totalGastos)} highlight={totalGastos > 0 ? 'red' : undefined} />
          <KpiCard
            label="Ganancia estimada"
            value={fmt(ganancia)}
            sub={`${pct(ganancia, totalVendido)} del total vendido`}
            highlight={ganancia >= 0 ? 'green' : 'red'}
          />
        </div>
      </section>

      {/* 2. Ventas por cliente */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wide">
          Ventas por cliente
        </h2>
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-right">Total vendido</th>
                  <th className="px-4 py-3 text-right">Cobrado</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {clientRows.map((r) => (
                  <tr key={r.name} className="hover:bg-stone-50/50">
                    <td className="px-4 py-2 font-medium text-stone-800">{r.name}</td>
                    <td className="px-4 py-2 text-right text-stone-700">{fmt(r.vendido)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-medium">{fmt(r.cobrado)}</td>
                    <td
                      className={cn(
                        'px-4 py-2 text-right font-medium',
                        r.pendiente > 0 ? 'text-amber-700' : 'text-stone-400'
                      )}
                    >
                      {fmt(r.pendiente)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold">
                  <td className="px-4 py-2 text-stone-900">TOTAL</td>
                  <td className="px-4 py-2 text-right text-stone-900">{fmt(totalVendido)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{fmt(totalCobrado)}</td>
                  <td className="px-4 py-2 text-right text-amber-700">{fmt(totalPendiente)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Ventas por semana */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wide">
          Ventas por semana
        </h2>
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Semana</th>
                  <th className="px-4 py-3 text-right">Total vendido</th>
                  <th className="px-4 py-3 text-right">Cobrado</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {weekRows.map((r) => (
                  <tr key={r.label} className="hover:bg-stone-50/50">
                    <td className="px-4 py-2 text-stone-700">{r.label}</td>
                    <td className="px-4 py-2 text-right font-medium text-stone-900">{fmt(r.vendido)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{fmt(r.cobrado)}</td>
                    <td className={cn('px-4 py-2 text-right', r.vendido - r.cobrado > 0 ? 'text-amber-700' : 'text-stone-400')}>
                      {fmt(r.vendido - r.cobrado)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold">
                  <td className="px-4 py-2 text-stone-900">TOTAL MES</td>
                  <td className="px-4 py-2 text-right text-stone-900">{fmt(totalVendido)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{fmt(totalCobrado)}</td>
                  <td className="px-4 py-2 text-right text-amber-700">{fmt(totalPendiente)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Ventas por producto */}
      {prodRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wide">
            Ventas por producto
          </h2>
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-right">Unidades</th>
                    <th className="px-4 py-3 text-right">Total vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {prodRows.map((r) => (
                    <tr key={r.name} className="hover:bg-stone-50/50">
                      <td className="px-4 py-2 text-stone-700">{r.name}</td>
                      <td className="px-4 py-2 text-right text-stone-600">{r.units}</td>
                      <td className="px-4 py-2 text-right font-medium text-stone-900">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold">
                    <td className="px-4 py-2 text-stone-900">TOTAL</td>
                    <td className="px-4 py-2 text-right text-stone-900">
                      {prodRows.reduce((s, r) => s + r.units, 0)}
                    </td>
                    <td className="px-4 py-2 text-right text-stone-900">{fmt(totalVendido)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 5. Gastos por categoría */}
      {catRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wide">
            Gastos por categoría
          </h2>
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right">% del total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {catRows.map((r) => (
                    <tr key={r.cat} className="hover:bg-stone-50/50">
                      <td className="px-4 py-2 text-stone-700">{r.cat}</td>
                      <td className="px-4 py-2 text-right font-medium text-stone-900">{fmt(r.monto)}</td>
                      <td className="px-4 py-2 text-right text-stone-500">{pct(r.monto, totalGastos)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold">
                    <td className="px-4 py-2 text-stone-900">TOTAL GASTOS</td>
                    <td className="px-4 py-2 text-right text-stone-900">{fmt(totalGastos)}</td>
                    <td className="px-4 py-2 text-right text-stone-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
