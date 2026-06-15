'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { syncOrderToSheets } from '@/actions/orders';
import { toast } from 'sonner';
import { Loader2, Sheet } from 'lucide-react';

export function SyncToSheetsButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await syncOrderToSheets(orderId);
      if (result.success) {
        toast.success('Pedido sincronizado al Sheet correctamente');
      } else {
        toast.error(`Error al sincronizar: ${result.error}`);
      }
    } catch {
      toast.error('Error inesperado al sincronizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sheet className="mr-2 h-4 w-4" />
      )}
      Sincronizar al Sheet
    </Button>
  );
}
