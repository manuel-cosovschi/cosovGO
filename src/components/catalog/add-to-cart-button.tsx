'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/components/cart/cart-provider';
import type { Product } from '@/types';
import { toast } from 'sonner';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { quantityStep, minValidQuantity, normalizeQuantity } from '@/lib/utils';

interface AddToCartButtonProps {
  product: Product;
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const step = quantityStep(product.sale_multiple);
  const minQ = minValidQuantity(product.min_quantity, product.sale_multiple);
  const [quantity, setQuantity] = useState(minQ);

  const handleAdd = () => {
    const qty = normalizeQuantity(quantity, product.min_quantity, product.sale_multiple);
    addItem({
      id: product.id,
      type: 'product',
      name: product.name,
      price: product.price,
      quantity: qty,
      image_url: product.image_url,
      min_advance_hours: product.min_advance_hours,
      sale_unit: product.sale_unit,
      min_quantity: product.min_quantity,
      sale_multiple: product.sale_multiple,
    });
    toast.success(`${product.name} x${qty} agregado al pedido`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setQuantity(Math.max(minQ, quantity - step))}
            disabled={quantity <= minQ}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            onBlur={() =>
              setQuantity(normalizeQuantity(quantity, product.min_quantity, product.sale_multiple))
            }
            className="w-20 text-center"
            min={minQ}
            step={step}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => setQuantity(quantity + step)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button size="lg" onClick={handleAdd} className="flex-1">
          <ShoppingBag className="mr-2 h-4 w-4" /> Agregar al pedido
        </Button>
      </div>
      {step > 1 && (
        <p className="text-xs text-stone-500">
          Se vende de a {step} {product.sale_unit}.
        </p>
      )}
    </div>
  );
}
