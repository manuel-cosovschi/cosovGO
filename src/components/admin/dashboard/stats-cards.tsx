import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Clock, ChefHat, Truck, AlertTriangle, DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { DashboardStats } from '@/types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Pedidos hoy',
      value: String(stats.orders_today),
      icon: ClipboardList,
      color: 'text-blue-600',
    },
    {
      title: 'Pendientes de revisión',
      value: String(stats.pending_review),
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'En producción',
      value: String(stats.in_production),
      icon: ChefHat,
      color: 'text-orange-600',
    },
    {
      title: 'Listos para entrega',
      value: String(stats.ready_for_delivery),
      icon: Truck,
      color: 'text-emerald-600',
    },
    {
      title: 'Inventario total',
      value: formatPrice(stats.valuation?.total_value || 0),
      icon: DollarSign,
      color: 'text-stone-600',
    },
    {
      title: 'Alertas de stock',
      value: String((stats.low_ingredients_count || 0) + (stats.low_products_count || 0)),
      icon: AlertTriangle,
      color: (stats.low_ingredients_count || 0) + (stats.low_products_count || 0) > 0 ? 'text-red-600' : 'text-stone-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
