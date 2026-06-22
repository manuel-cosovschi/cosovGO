'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleCobrado, updatePagoDetails } from '@/actions/movimientos';
import type { OrderWithItems } from '@/types';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

const fmt = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-AR');

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface PedidoRow {
  orderId: string;
  date: string | null;
  cliente: string;
  producto: string;
  cantidad: number;
  precioUnit: number;
  total: number;
  cobrado: boolean;
  fechaCobro: string | null;
  formaPago: string | null;
  isFirstOfDate: boolean;
  dateSpan: number;
  isFirstOfOrder: boolean;
  orderSpan: number;
}

function buildRows(orders: OrderWithItems[]): PedidoRow[] {
  const rows: PedidoRow[] = [];

  // Group by date
  const byDate = new Map<string, OrderWithItems[]>();
  for (const o of orders) {
    const key = o.delivery_date ?? '__nodate__';
    const list = byDate.get(key) ?? [];
    list.push(o);
    byDate.set(key, list);
  }

  for (const [date, dateOrders] of byDate) {
    // Count total items for this date span
    const dateSpan = dateOrders.reduce((s, o) => s + Math.max(o.items.length, 1), 0);
    let dateFirstRow = true;

    for (const order of dateOrders) {
      const itemCount = Math.max(order.items.length, 1);
      let orderFirstRow = true;

      if (order.items.length === 0) {
        rows.push({
          orderId: order.id,
          date: date === '__nodate__' ? null : date,
          cliente: order.contact_name,
          producto: '—',
          cantidad: 0,
          precioUnit: 0,
          total: 0,
          cobrado: order.cobrado,
          fechaCobro: order.fecha_cobro,
          formaPago: order.forma_pago,
          isFirstOfDate: dateFirstRow,
          dateSpan,
          isFirstOfOrder: true,
          orderSpan: 1,
        });
        dateFirstRow = false;
        continue;
      }

      for (const item of order.items) {
        rows.push({
          orderId: order.id,
          date: date === '__nodate__' ? null : date,
          cliente: order.contact_name,
          producto: item.item_name,
          cantidad: item.quantity,
          precioUnit: item.unit_price,
          total: item.subtotal,
          cobrado: order.cobrado,
          fechaCobro: order.fecha_cobro,
          formaPago: order.forma_pago,
          isFirstOfDate: dateFirstRow,
          dateSpan,
          isFirstOfOrder: orderFirstRow,
          orderSpan: itemCount,
        });
        dateFirstRow = false;
        orderFirstRow = false;
      }
    }
  }

  return rows;
}

function CobradoCell({
  row,
  onChange,
}: {
  row: PedidoRow;
  onChange: (orderId: string, cobrado: boolean, fechaCobro?: string | null, formaPago?: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fecha, setFecha] = useState(row.fechaCobro ?? '');
  const [forma, setForma] = useState(row.formaPago ?? '');

  const handleToggle = () => {
    const newVal = !row.cobrado;
    onChange(row.orderId, newVal, newVal ? (fecha || null) : null, newVal ? (forma || null) : null);
    if (newVal) setEditing(true);
    else setEditing(false);
  };

  const handleSaveDetails = () => {
    onChange(row.orderId, row.cobrado, fecha || null, forma || null);
    setEditing(false);
  };

  return (
    <div className="space-y-1 min-w-[120px]">
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
          row.cobrado
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
        )}
      >
        {row.cobrado && <Check className="h-3 w-3" />}
        {row.cobrado ? 'Cobrado' : 'Pendiente'}
      </button>

      {row.cobrado && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="block text-xs text-stone-400 hover:text-stone-600 truncate max-w-[160px]"
        >
          {row.fechaCobro ? fmtDate(row.fechaCobro) : 'Agregar fecha'}
          {row.formaPago ? ` · ${row.formaPago}` : ''}
        </button>
      )}

      {row.cobrado && editing && (
        <div className="flex flex-col gap-1 bg-white border border-stone-200 rounded-md p-2 shadow-sm z-10 relative">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="text-xs border border-stone-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-stone-300"
          />
          <input
            type="text"
            placeholder="Forma de pago"
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="text-xs border border-stone-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-stone-300"
          />
          <button
            onClick={handleSaveDetails}
            className="text-xs bg-stone-800 text-white rounded px-2 py-0.5 hover:bg-stone-700"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  orders: OrderWithItems[];
  year: number;
  month: number;
}

export function PedidosTab({ orders, year, month }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Local cobrado state for optimistic updates
  const [cobradoState, setCobradoState] = useState<
    Map<string, { cobrado: boolean; fechaCobro: string | null; formaPago: string | null }>
  >(() => {
    const m = new Map();
    for (const o of orders) {
      m.set(o.id, { cobrado: o.cobrado, fechaCobro: o.fecha_cobro, formaPago: o.forma_pago });
    }
    return m;
  });

  const mergedOrders = orders.map((o) => {
    const s = cobradoState.get(o.id);
    return s ? { ...o, cobrado: s.cobrado, fecha_cobro: s.fechaCobro, forma_pago: s.formaPago } : o;
  });

  const handleCobradoChange = (
    orderId: string,
    cobrado: boolean,
    fechaCobro?: string | null,
    formaPago?: string | null
  ) => {
    setCobradoState((prev) => {
      const next = new Map(prev);
      next.set(orderId, { cobrado, fechaCobro: fechaCobro ?? null, formaPago: formaPago ?? null });
      return next;
    });
    startTransition(async () => {
      await toggleCobrado(orderId, cobrado, fechaCobro, formaPago);
      router.refresh();
    });
  };

  const handleDetailsChange = (
    orderId: string,
    fechaCobro: string | null,
    formaPago: string | null
  ) => {
    setCobradoState((prev) => {
      const next = new Map(prev);
      const cur = next.get(orderId) ?? { cobrado: false, fechaCobro: null, formaPago: null };
      next.set(orderId, { ...cur, fechaCobro, formaPago });
      return next;
    });
    startTransition(async () => {
      await updatePagoDetails(orderId, fechaCobro, formaPago);
      router.refresh();
    });
  };

  const rows = buildRows(mergedOrders);

  const totalVendido = mergedOrders.reduce((s, o) => s + o.subtotal, 0);
  const totalCobrado = mergedOrders.filter((o) => o.cobrado).reduce((s, o) => s + o.subtotal, 0);
  const totalPendiente = totalVendido - totalCobrado;

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-12 text-center text-stone-400 text-sm">
        No hay pedidos en este mes
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      {pending && (
        <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 border-b border-stone-200 text-xs text-stone-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left whitespace-nowrap">Fecha entrega</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Cliente</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Cantidad</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Precio unit.</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">¿Cobrado?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row, idx) => (
              <tr
                key={`${row.orderId}-${idx}`}
                className={cn(
                  'hover:bg-stone-50/50 transition-colors',
                  row.isFirstOfDate && idx > 0 ? 'border-t-2 border-stone-200' : ''
                )}
              >
                {row.isFirstOfDate && (
                  <td
                    rowSpan={row.dateSpan}
                    className="px-4 py-2 align-top font-medium text-stone-700 whitespace-nowrap border-r border-stone-100"
                  >
                    {fmtDate(row.date)}
                  </td>
                )}
                {row.isFirstOfOrder && (
                  <td
                    rowSpan={row.orderSpan}
                    className="px-4 py-2 align-top font-medium text-stone-800 whitespace-nowrap"
                  >
                    {row.cliente}
                  </td>
                )}
                <td className="px-4 py-2 text-stone-600">{row.producto}</td>
                <td className="px-4 py-2 text-right text-stone-600">
                  {row.cantidad > 0 ? row.cantidad : ''}
                </td>
                <td className="px-4 py-2 text-right text-stone-600 whitespace-nowrap">
                  {row.precioUnit > 0 ? fmt(row.precioUnit) : ''}
                </td>
                <td className="px-4 py-2 text-right font-medium text-stone-800 whitespace-nowrap">
                  {row.total > 0 ? fmt(row.total) : ''}
                </td>
                {row.isFirstOfOrder && (
                  <td rowSpan={row.orderSpan} className="px-4 py-2 align-top">
                    <CobradoCell
                      row={row}
                      onChange={(orderId, cobrado, fechaCobro, formaPago) => {
                        if (cobrado !== row.cobrado || fechaCobro !== undefined) {
                          if (cobrado !== row.cobrado) {
                            handleCobradoChange(orderId, cobrado, fechaCobro, formaPago);
                          } else {
                            handleDetailsChange(orderId, fechaCobro ?? null, formaPago ?? null);
                          }
                        }
                      }}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div className="border-t-2 border-stone-200 bg-stone-50 px-4 py-3 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-stone-500">Total vendido</span>
          <span className="ml-2 font-bold text-stone-900">{fmt(totalVendido)}</span>
        </div>
        <div>
          <span className="text-stone-500">Cobrado</span>
          <span className="ml-2 font-bold text-emerald-700">{fmt(totalCobrado)}</span>
        </div>
        <div>
          <span className="text-stone-500">Pendiente</span>
          <span className="ml-2 font-bold text-amber-700">{fmt(totalPendiente)}</span>
        </div>
      </div>
    </div>
  );
}
