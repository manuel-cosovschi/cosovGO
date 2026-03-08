'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listOrders } from '@/actions/orders';
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatPrice } from '@/lib/utils';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type Order, type OrderStatus } from '@/types';
import { Search } from 'lucide-react';

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await listOrders({
        status: statusFilter === 'all' ? undefined : (statusFilter as OrderStatus),
        search: search || undefined,
        page,
        per_page: 20,
      });
      setOrders(result.orders);
      setTotal(result.total);
      setLoading(false);
    }
    load();
  }, [statusFilter, search, page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Pedidos</h1>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
          </div>
        ) : orders.length === 0 ? (
          <p className="px-6 py-16 text-center text-stone-500">No se encontraron pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">#</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Entrega</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${order.id}`} className="font-medium text-stone-900 hover:underline">
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{order.business_name}</p>
                      <p className="text-xs text-stone-500">{order.contact_name}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(order.delivery_date)}</td>
                    <td className="px-4 py-3 font-medium text-stone-900">{formatPrice(order.subtotal)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-500">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">{total} pedidos en total</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="flex items-center px-3 text-sm text-stone-500">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
