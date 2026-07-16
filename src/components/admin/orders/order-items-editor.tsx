'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatPrice, quantityStep, minValidQuantity, normalizeQuantity } from '@/lib/utils';
import { updateOrderItems } from '@/actions/orders';
import type { OrderItem } from '@/types';
import { toast } from 'sonner';
import { Loader2, Minus, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface EditableProduct {
  id: string;
  name: string;
  price: number;
  min_quantity: number;
  sale_multiple: number;
  sale_unit: string;
}

interface Row {
  key: string;
  product_id: string | null;
  package_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  min_quantity: number;
  sale_multiple: number;
  sale_unit: string;
}

interface Props {
  orderId: string;
  items: OrderItem[];
  products: EditableProduct[];
}

function buildRows(items: OrderItem[], products: EditableProduct[]): Row[] {
  return items.map((item, idx) => {
    const prod = item.product_id ? products.find((p) => p.id === item.product_id) : undefined;
    return {
      key: item.id || `row-${idx}`,
      product_id: item.product_id,
      package_id: item.package_id,
      name: item.item_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      min_quantity: prod?.min_quantity ?? 1,
      sale_multiple: prod?.sale_multiple ?? 1,
      sale_unit: prod?.sale_unit ?? 'unidad',
    };
  });
}

export function OrderItemsEditor({ orderId, items, products }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => buildRows(items, products));
  const [addId, setAddId] = useState('');

  const start = () => {
    setRows(buildRows(items, products));
    setAddId('');
    setEditing(true);
  };

  const setQty = (key: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? { ...r, quantity: normalizeQuantity(qty, r.min_quantity, r.sale_multiple) }
          : r
      )
    );
  };

  const remove = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const addProduct = (id: string) => {
    if (!id) return;
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    setRows((prev) => {
      const existing = prev.find((r) => r.product_id === id);
      const step = quantityStep(prod.sale_multiple);
      if (existing) {
        return prev.map((r) =>
          r.product_id === id
            ? { ...r, quantity: normalizeQuantity(r.quantity + step, r.min_quantity, r.sale_multiple) }
            : r
        );
      }
      return [
        ...prev,
        {
          key: `new-${id}-${prev.length}`,
          product_id: id,
          package_id: null,
          name: prod.name,
          unit_price: prod.price,
          quantity: minValidQuantity(prod.min_quantity, prod.sale_multiple),
          min_quantity: prod.min_quantity,
          sale_multiple: prod.sale_multiple,
          sale_unit: prod.sale_unit,
        },
      ];
    });
    setAddId('');
  };

  const subtotal = rows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0);

  const save = async () => {
    if (rows.length === 0) {
      toast.error('El pedido debe tener al menos un producto.');
      return;
    }
    setSaving(true);
    const result = await updateOrderItems(
      orderId,
      rows.map((r) => ({ product_id: r.product_id, package_id: r.package_id, quantity: r.quantity }))
    );
    if (result.success) {
      toast.success('Pedido actualizado');
      setEditing(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Error al guardar');
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={start}>
          <Pencil className="mr-1 h-3 w-3" /> Editar productos
        </Button>
      </div>
    );
  }

  const availableToAdd = products.filter((p) => !rows.some((r) => r.product_id === p.id));

  return (
    <div className="space-y-4 rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-800">Editar productos</p>
        <button onClick={() => setEditing(false)} className="text-stone-400 hover:text-stone-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-stone-200">
        {rows.map((r) => {
          const step = quantityStep(r.sale_multiple);
          const minQ = minValidQuantity(r.min_quantity, r.sale_multiple);
          return (
            <div key={r.key} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 truncate">{r.name}</p>
                <p className="text-xs text-stone-500">
                  {formatPrice(r.unit_price)} / {r.sale_unit}
                  {step > 1 && <span className="ml-1 text-stone-400">· de a {step}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setQty(r.key, r.quantity - step)}
                  disabled={r.quantity <= minQ}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{r.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setQty(r.key, r.quantity + step)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="w-20 text-right text-sm font-medium text-stone-900">
                {formatPrice(r.unit_price * r.quantity)}
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-stone-400 hover:text-red-600"
                onClick={() => remove(r.key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {availableToAdd.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={addId}
            onChange={(e) => addProduct(e.target.value)}
            className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          >
            <option value="">+ Agregar producto…</option>
            {availableToAdd.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatPrice(p.price)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-stone-200 pt-3">
        <span className="text-sm font-semibold text-stone-900">Subtotal productos</span>
        <span className="text-base font-bold text-stone-900">{formatPrice(subtotal)}</span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Guardar cambios
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
