'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { adjustProductStock, registerProduction } from '@/actions/ingredients';
import type { Product } from '@/types';
import { Loader2, Package, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ProductStockManagerProps {
  product: Product;
}

export function ProductStockManager({ product }: ProductStockManagerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [adjustQty, setAdjustQty] = useState(String((product as unknown as { stock_quantity: number }).stock_quantity || 0));
  const [adjustNotes, setAdjustNotes] = useState('');
  const [batches, setBatches] = useState('1');
  const [productionNotes, setProductionNotes] = useState('');

  const stockQty = (product as unknown as { stock_quantity: number }).stock_quantity || 0;
  const batchSize = (product as unknown as { batch_size: number }).batch_size || 1;

  const handleAdjust = async () => {
    if (!adjustNotes.trim()) {
      toast.error('Escribí un motivo para el ajuste');
      return;
    }
    setSaving(true);
    const result = await adjustProductStock(product.id, {
      new_quantity: Number(adjustQty),
      notes: adjustNotes,
    });
    if (result.success) {
      toast.success('Stock ajustado');
      setAdjustNotes('');
      router.refresh();
    } else {
      toast.error(result.error || 'Error');
    }
    setSaving(false);
  };

  const handleProduction = async () => {
    const numBatches = Number(batches);
    if (numBatches <= 0) {
      toast.error('Ingresá una cantidad de lotes válida');
      return;
    }
    setSaving(true);
    const result = await registerProduction(product.id, numBatches, productionNotes || undefined);
    if (result.success) {
      const units = numBatches * batchSize;
      toast.success(`Producción registrada: ${units} unidades`);
      if (result.alerts) {
        result.alerts.forEach((alert) => toast.warning(alert));
      }
      setBatches('1');
      setProductionNotes('');
      router.refresh();
    } else {
      toast.error(result.error || 'Error');
    }
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          <Package className="h-5 w-5" /> Stock de producto
        </h2>
        <p className="text-sm text-stone-500">
          Stock actual: <span className="font-medium text-stone-900">{stockQty} {product.sale_unit}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Adjust stock */}
        <div className="rounded-md border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-medium text-stone-700">Ajustar stock</h3>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Nuevo valor</label>
            <input
              type="number"
              min="0"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Motivo *</label>
            <input
              type="text"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="Ej: Conteo físico"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <Button size="sm" onClick={handleAdjust} disabled={saving} className="w-full">
            Ajustar
          </Button>
        </div>

        {/* Register production */}
        <div className="rounded-md border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-medium text-stone-700 flex items-center gap-1">
            <ChefHat className="h-4 w-4" /> Registrar producción
          </h3>
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Lotes ({batchSize} unidades c/u)
            </label>
            <input
              type="number"
              min="1"
              value={batches}
              onChange={(e) => setBatches(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
            <p className="text-xs text-stone-400 mt-1">
              = {Number(batches) * batchSize} {product.sale_unit}
            </p>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              placeholder="Ej: Hornada mañana"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <Button size="sm" onClick={handleProduction} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Registrar producción
          </Button>
        </div>
      </div>
    </div>
  );
}
