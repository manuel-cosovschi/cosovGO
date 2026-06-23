'use client';

import { useState } from 'react';
import { MonthNav } from './month-nav';
import { PedidosTab } from './pedidos-tab';
import { GastosTab } from './gastos-tab';
import { ResumenTab } from './resumen-tab';
import { cn } from '@/lib/utils';
import type { Gasto, OrderWithItems } from '@/types';

type Tab = 'pedidos' | 'gastos' | 'resumen';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pedidos', label: 'Pedidos del Mes' },
  { id: 'gastos', label: 'Gastos del Negocio' },
  { id: 'resumen', label: 'Resumen' },
];

interface Props {
  orders: OrderWithItems[];
  gastos: Gasto[];
  year: number;
  month: number;
}

export function MovimientosClient({ orders, gastos, year, month }: Props) {
  const [tab, setTab] = useState<Tab>('pedidos');

  return (
    <div className="space-y-4">
      {/* Month nav + tab bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNav year={year} month={month} />
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active tab */}
      {tab === 'pedidos' && <PedidosTab orders={orders} year={year} month={month} />}
      {tab === 'gastos' && <GastosTab gastos={gastos} year={year} month={month} />}
      {tab === 'resumen' && <ResumenTab orders={orders} gastos={gastos} year={year} month={month} />}
    </div>
  );
}
