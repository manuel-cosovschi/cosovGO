import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrder } from '@/actions/orders';
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge';
import { OrderStatusActions } from '@/components/admin/orders/order-status-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateTime, formatPrice } from '@/lib/utils';
import { DELIVERY_METHOD_LABELS } from '@/types';
import type { OrderStatus, DeliveryMethod } from '@/types';
import { ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver a pedidos
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Pedido #{order.order_number}
          </h1>
          <p className="text-sm text-stone-500">
            Creado el {formatDateTime(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </div>

      {/* Status actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cambiar estado</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusActions orderId={order.id} currentStatus={order.status as OrderStatus} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Client info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Nombre</span>
              <span className="font-medium">{order.contact_name || order.business_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Teléfono</span>
              <span className="font-medium">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Email</span>
              <span className="font-medium">{order.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Método</span>
              <span className="font-medium">
                {DELIVERY_METHOD_LABELS[order.delivery_method as DeliveryMethod]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Fecha</span>
              <span className="font-medium">{formatDate(order.delivery_date)}</span>
            </div>
            {order.time_slot && (
              <div className="flex justify-between">
                <span className="text-stone-500">Franja</span>
                <span className="font-medium">{order.time_slot}</span>
              </div>
            )}
            {order.address && (
              <div className="flex justify-between">
                <span className="text-stone-500">Dirección</span>
                <span className="font-medium">{order.address}</span>
              </div>
            )}
            {order.city && (
              <div className="flex justify-between">
                <span className="text-stone-500">Ciudad</span>
                <span className="font-medium">{order.city}</span>
              </div>
            )}
            {order.requires_invoice && (
              <div className="flex justify-between">
                <span className="text-stone-500">Factura</span>
                <span className="font-medium text-amber-600">Sí, necesita factura</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-stone-200">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-stone-900">{item.item_name}</p>
                  <p className="text-sm text-stone-500">
                    {formatPrice(item.unit_price)} x {item.quantity}
                  </p>
                </div>
                <p className="font-medium text-stone-900">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold">{formatPrice(order.subtotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {order.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones del cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-700">{order.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Status history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de estados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.status_history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-stone-400 flex-shrink-0" />
                <div>
                  <p className="text-stone-900">
                    {entry.from_status ? (
                      <>
                        <OrderStatusBadge status={entry.from_status as OrderStatus} /> →{' '}
                      </>
                    ) : null}
                    <OrderStatusBadge status={entry.to_status as OrderStatus} />
                  </p>
                  <p className="text-xs text-stone-500">{formatDateTime(entry.created_at)}</p>
                  {entry.notes && <p className="text-xs text-stone-500 mt-1">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
