import Link from 'next/link';
import { getDashboardStats } from '@/actions/dashboard';
import { StatsCards } from '@/components/admin/dashboard/stats-cards';
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge';
import { formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/types';

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">Resumen operativo de COSOV.</p>
      </div>

      <StatsCards stats={stats} />

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
