import Link from 'next/link';
import { getOrderTracking } from '@/actions/inventory';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, DELIVERY_METHOD_LABELS } from '@/types';
import type { OrderStatus, DeliveryMethod } from '@/types';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, Clock, Package, Truck } from 'lucide-react';

interface Props {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderTrackingPage({ params }: Props) {
  const { orderNumber } = await params;
  const tracking = await getOrderTracking(Number(orderNumber));

  if (!tracking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Pedido no encontrado</h1>
          <p className="text-stone-500 mb-6">
            No encontramos un pedido con el número #{orderNumber}
          </p>
          <Link
            href="/pedido/seguimiento"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" /> Intentar con otro número
          </Link>
        </div>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'shipped': return <Truck className="h-5 w-5 text-purple-600" />;
      case 'ready': return <Package className="h-5 w-5 text-emerald-600" />;
      default: return <Clock className="h-5 w-5 text-stone-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/pedido/seguimiento"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Buscar otro pedido
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">
                Pedido #{tracking.order_number}
              </h1>
              <p className="text-sm text-stone-500">{tracking.business_name}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[tracking.status]}`}>
              {ORDER_STATUS_LABELS[tracking.status]}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg border border-stone-200 bg-white p-6 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-stone-500">Fecha de entrega</p>
              <p className="font-medium text-stone-900">{formatDate(tracking.delivery_date)}</p>
            </div>
            <div>
              <p className="text-stone-500">Método</p>
              <p className="font-medium text-stone-900">
                {DELIVERY_METHOD_LABELS[tracking.delivery_method as DeliveryMethod]}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Pedido realizado</p>
              <p className="font-medium text-stone-900">{formatDateTime(tracking.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-lg border border-stone-200 bg-white mb-4">
          <div className="border-b border-stone-200 px-6 py-3">
            <h2 className="font-semibold text-stone-900">Detalle del pedido</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {tracking.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">{item.name}</p>
                  <p className="text-xs text-stone-500">
                    {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                </div>
                <p className="text-sm font-medium text-stone-900">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-200 px-6 py-3 flex items-center justify-between">
            <p className="font-semibold text-stone-900">Total</p>
            <p className="font-semibold text-stone-900">{formatPrice(tracking.subtotal)}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Historial</h2>
          <div className="space-y-4">
            {tracking.timeline.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5">{statusIcon(event.status)}</div>
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    {ORDER_STATUS_LABELS[event.status as OrderStatus] || event.status}
                  </p>
                  <p className="text-xs text-stone-500">{formatDateTime(event.date)}</p>
                  {event.notes && (
                    <p className="text-xs text-stone-400 mt-0.5">{event.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
