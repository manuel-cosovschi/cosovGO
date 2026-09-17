import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS_COLORS, orderStatusLabel, type OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  /** Acepta string porque el historial viejo trae estados ya retirados. */
  status: OrderStatus | string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const color =
    ORDER_STATUS_COLORS[status as OrderStatus] ?? 'bg-stone-100 text-stone-700';

  return (
    <Badge variant="secondary" className={cn(color)}>
      {orderStatusLabel(status)}
    </Badge>
  );
}
