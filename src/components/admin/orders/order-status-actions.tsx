'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VALID_TRANSITIONS, ORDER_STATUS_LABELS, type OrderStatus } from '@/types';
import { updateOrderStatus, updateCostoEnvio } from '@/actions/orders';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
  deliveryMethod?: string;
  currentCostoEnvio?: number | null;
  onStatusChange?: () => void;
}

export function OrderStatusActions({
  orderId,
  currentStatus,
  deliveryMethod,
  currentCostoEnvio,
  onStatusChange,
}: OrderStatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [costoEnvio, setCostoEnvio] = useState(
    currentCostoEnvio != null ? String(currentCostoEnvio) : ''
  );
  const router = useRouter();
  const transitions = VALID_TRANSITIONS[currentStatus];

  if (transitions.length === 0) return null;

  const handleApprove = async () => {
    setLoading('approved');
    try {
      const costoNum = costoEnvio.trim() !== '' ? parseFloat(costoEnvio) : null;
      if (costoNum !== null && (isNaN(costoNum) || costoNum < 0)) {
        toast.error('El costo de envío debe ser un número positivo.');
        setLoading(null);
        return;
      }
      await updateCostoEnvio(orderId, costoNum);

      const result = await updateOrderStatus(orderId, 'approved');
      if (result.success) {
        toast.success('Pedido aprobado');
        setShowApproveForm(false);
        onStatusChange?.();
        router.refresh();
      } else {
        toast.error(result.error || 'Error al aprobar');
      }
    } catch {
      toast.error('Error al aprobar');
    } finally {
      setLoading(null);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === 'approved') {
      setShowApproveForm(true);
      return;
    }
    setLoading(newStatus);
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        toast.success(`Estado actualizado a "${ORDER_STATUS_LABELS[newStatus]}"`);
        onStatusChange?.();
        router.refresh();
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
    <div className="space-y-3">
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
            {status === 'approved' ? 'Aprobar pedido' : ORDER_STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      {/* Approval form with optional shipping cost */}
      {showApproveForm && (
        <div className="rounded-md border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-800">Aprobar pedido</p>
            <button
              onClick={() => setShowApproveForm(false)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">
              Costo de envío
              {deliveryMethod !== 'delivery' && (
                <span className="ml-1 text-stone-400">(opcional)</span>
              )}
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-stone-500">$</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={costoEnvio}
                onChange={(e) => setCostoEnvio(e.target.value)}
                className="w-36 rounded border border-stone-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <p className="text-xs text-stone-400">
              Se sumará al comprobante que recibe el cliente.
            </p>
          </div>

          <Button
            size="sm"
            disabled={loading !== null}
            onClick={handleApprove}
          >
            {loading === 'approved' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Confirmar aprobación
          </Button>
        </div>
      )}
    </div>
  );
}
