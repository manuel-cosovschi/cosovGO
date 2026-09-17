'use client';

import { useState, useTransition } from 'react';
import { updateOrderStatus } from '@/actions/orders';
import {
  ORDER_STATUSES,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  orderStatusLabel,
  type OrderStatus,
} from '@/types';
import { toast } from 'sonner';
import { Loader2, ChevronDown } from 'lucide-react';

interface OrderStatusSelectProps {
  orderId: string;
  status: string;
  /** Avisa al padre el estado nuevo para que refresque su propia lista. */
  onChanged?: (newStatus: OrderStatus) => void;
}

/**
 * Selector de estado que guarda solo. Se usa tanto en la lista de pedidos
 * (para no tener que entrar a cada uno) como en el detalle.
 *
 * Deja mover el pedido a cualquier estado, también hacia atrás: Valen es la
 * única que los administra y necesita poder corregirse.
 */
export function OrderStatusSelect({ orderId, status, onChanged }: OrderStatusSelectProps) {
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: string) => {
    if (next === current) return;

    const previous = current;
    setCurrent(next); // optimista: la etiqueta cambia al instante
    setSaving(true);

    try {
      const result = await updateOrderStatus(orderId, next as OrderStatus);
      if (!result.success) {
        setCurrent(previous);
        toast.error(result.error || 'No se pudo cambiar el estado');
        return;
      }
      toast.success(`Pedido marcado como "${ORDER_STATUS_LABELS[next as OrderStatus]}"`);
      startTransition(() => onChanged?.(next as OrderStatus));
    } catch {
      setCurrent(previous);
      toast.error('No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  };

  const color =
    ORDER_STATUS_COLORS[current as OrderStatus] ?? 'bg-stone-100 text-stone-700';
  const busy = saving || pending;

  return (
    <div className="relative inline-flex items-center">
      <span
        className={`inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-7 text-xs font-medium ${color} ${
          busy ? 'opacity-60' : ''
        }`}
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        {orderStatusLabel(current)}
      </span>

      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 opacity-60" />

      {/* El <select> nativo va encima y transparente: se comporta bien en
          celular (usa el picker del sistema) y no necesita JS de posicionamiento. */}
      <select
        aria-label="Cambiar estado del pedido"
        value={ORDER_STATUS_LABELS[current as OrderStatus] ? current : ''}
        disabled={busy}
        onChange={(e) => handleChange(e.target.value)}
        className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-wait"
      >
        {/* Un pedido viejo puede tener un estado que ya no se asigna. Lo
            mostramos como opción inicial para no perder el valor de vista. */}
        {!ORDER_STATUS_LABELS[current as OrderStatus] && (
          <option value="">{orderStatusLabel(current)}</option>
        )}
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
