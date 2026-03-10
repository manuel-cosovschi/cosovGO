import Link from 'next/link';
import { getDashboardStats } from '@/actions/dashboard';
import { StatsCards } from '@/components/admin/dashboard/stats-cards';
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge';
import { formatDate, formatPrice } from '@/lib/utils';
import type { OrderStatus } from '@/types';
import { AlertTriangle } from 'lucide-react';

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const criticalAlerts = stats.alerts?.filter((a) => a.severity === 'critical') || [];
  const warningAlerts = stats.alerts?.filter((a) => a.severity === 'warning') || [];
  const allAlerts = [...criticalAlerts, ...warningAlerts];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">Resumen operativo de COSOV.</p>
      </div>

      <StatsCards stats={stats} />

      {/* Stock Alerts */}
      {allAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between border-b border-amber-200 px-6 py-3">
            <h2 className="font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas de stock ({allAlerts.length})
            </h2>
            <Link href="/admin/inventario" className="text-sm text-amber-700 hover:text-amber-900">
              Ver inventario
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {allAlerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-2">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <p className="text-sm text-stone-800">{alert.message}</p>
              </div>
            ))}
            {allAlerts.length > 5 && (
              <div className="px-6 py-2">
                <Link href="/admin/inventario" className="text-sm text-amber-700 hover:text-amber-900">
                  Ver {allAlerts.length - 5} alertas más...
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Summary */}
      {stats.valuation && stats.valuation.total_value > 0 && (
        <div className="rounded-lg border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
            <h2 className="font-semibold text-stone-900">Valorización del inventario</h2>
            <Link href="/admin/inventario" className="text-sm text-stone-500 hover:text-stone-900">
              Ver detalle
            </Link>
          </div>
          <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-stone-200">
            <div className="px-6 py-4 text-center">
              <p className="text-sm text-stone-500">Ingredientes</p>
              <p className="text-lg font-bold text-stone-900">{formatPrice(stats.valuation.ingredients_value)}</p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-sm text-stone-500">Elaborados</p>
              <p className="text-lg font-bold text-stone-900">{formatPrice(stats.valuation.products_value)}</p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-sm text-stone-500">Comprometido</p>
              <p className="text-lg font-bold text-stone-900">{formatPrice(stats.valuation.committed_cost)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="font-semibold text-stone-900">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm text-stone-500 hover:text-stone-900">
            Ver todos
          </Link>
        </div>
        <div className="divide-y divide-stone-200">
          {stats.recent_orders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-stone-500">
              No hay pedidos todavía.
            </p>
          ) : (
            stats.recent_orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    #{order.order_number} — {order.business_name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {order.contact_name} · {formatDate(order.delivery_date)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status as OrderStatus} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
