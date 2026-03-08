'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VALID_TRANSITIONS, ORDER_STATUS_LABELS, type OrderStatus } from '@/types';
import { updateOrderStatus } from '@/actions/orders';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusChange?: () => void;
}

export function OrderStatusActions({ orderId, currentStatus, onStatusChange }: OrderStatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const transitions = VALID_TRANSITIONS[currentStatus];

  if (transitions.length === 0) return null;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setLoading(newStatus);
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        toast.success(`Estado actualizado a "${ORDER_STATUS_LABELS[newStatus]}"`);
        onStatusChange?.();
      } else {
        toast.error(result.error || 'Error al cambiar estado');
      }
    } catch {
      toast.error('Error al cambiar estado');
    } finally {
      setLoading(null);
    }
  };

  const getVariant = (status: OrderStatus) => {
    if (status === 'approved' || status === 'delivered') return 'default' as const;
    if (status === 'rejected' || status === 'cancelled') return 'destructive' as const;
    return 'outline' as const;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((status) => (
        <Button
          key={status}
          variant={getVariant(status)}
          size="sm"
          disabled={loading !== null}
          onClick={() => handleStatusChange(status)}
        >
          {loading === status && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {ORDER_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
