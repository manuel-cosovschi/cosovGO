import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(ORDER_STATUS_COLORS[status])}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
