'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrderStatusSelect } from './order-status-select';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types';
import { updateOrderStatus, updateCostoEnvio } from '@/actions/orders';
import { toast } from 'sonner';
import { Loader2, X, Check } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [costoEnvio, setCostoEnvio] = useState(
    currentCostoEnvio != null ? String(currentCostoEnvio) : ''
  );
  const router = useRouter();

  const sinAprobar = currentStatus === 'received';

  const handleApprove = async () => {
    setLoading(true);
    try {
      const costoNum = costoEnvio.trim() !== '' ? parseFloat(costoEnvio) : null;
      if (costoNum !== null && (isNaN(costoNum) || costoNum < 0)) {
        toast.error('El costo de envío debe ser un número positivo.');
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">Estado:</span>
          <OrderStatusSelect
            orderId={orderId}
            status={currentStatus}
            onChanged={() => {
              onStatusChange?.();
              router.refresh();
            }}
          />
        </div>

        {/* Atajo para el caso más común, que además pide el costo de envío. */}
        {sinAprobar && !showApproveForm && (
          <Button size="sm" onClick={() => setShowApproveForm(true)}>
            <Check className="mr-1 h-3.5 w-3.5" />
            Aprobar pedido
          </Button>
        )}
      </div>

      <p className="text-xs text-stone-400">
        Podés mover el pedido a cualquier estado, incluso volver atrás si te
        equivocaste. El cliente solo recibe mail al aprobar y al cancelar.
      </p>

      {/* Aprobación con costo de envío opcional */}
      {showApproveForm && (
        <div className="rounded-md border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-800">
              Aprobar pedido — pasa a &quot;{ORDER_STATUS_LABELS.approved}&quot;
            </p>
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

          <Button size="sm" disabled={loading} onClick={handleApprove}>
            {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Confirmar aprobación
          </Button>
        </div>
      )}
    </div>
  );
}
