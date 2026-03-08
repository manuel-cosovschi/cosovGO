import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Clock, ChefHat, Truck } from 'lucide-react';
import type { DashboardStats } from '@/types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Pedidos hoy',
      value: stats.orders_today,
      icon: ClipboardList,
      color: 'text-blue-600',
    },
    {
      title: 'Pendientes de revisión',
      value: stats.pending_review,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'En producción',
      value: stats.in_production,
      icon: ChefHat,
      color: 'text-orange-600',
    },
    {
      title: 'Listos para entrega',
      value: stats.ready_for_delivery,
      icon: Truck,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
