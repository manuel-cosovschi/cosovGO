'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { CartItem } from '@/types';
import { normalizeQuantity } from '@/lib/utils';
import type { Canal } from '@/lib/canal';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  maxAdvanceHours: number | null;
  /** Canal del carrito actual. Los precios guardados son los de este canal. */
  canal: Canal;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'cosov-cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveCart(items);
    }
  }, [items, mounted]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Si venía armando un pedido en el otro catálogo, los precios no son
      // comparables: se empieza de nuevo en vez de mezclar mayorista con
      // minorista en el mismo pedido.
      const canalPrevio = prev.find((i) => i.canal)?.canal;
      const canalNuevo = item.canal ?? 'mayorista';
      if (canalPrevio && canalPrevio !== canalNuevo) {
        toast.info('Empezamos un pedido nuevo porque cambiaste de catálogo.');
        return [item];
      }

      const existing = prev.find((i) => i.id === item.id && i.type === item.type);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, quantity: normalizeQuantity(quantity, i.min_quantity, i.sale_multiple) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const maxAdvanceHours = items.reduce<number | null>((max, i) => {
    if (i.min_advance_hours === null) return max;
    if (max === null) return i.min_advance_hours;
    return Math.max(max, i.min_advance_hours);
  }, null);
  const canal: Canal = items.find((i) => i.canal)?.canal ?? 'mayorista';

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        maxAdvanceHours,
        canal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
