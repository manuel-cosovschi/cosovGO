'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SeguimientoPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = orderNumber.trim().replace('#', '');
    if (num) {
      router.push(`/pedido/seguimiento/${num}`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">COSOV.</h1>
          <p className="mt-2 text-stone-500">Seguimiento de pedido</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <label htmlFor="orderNumber" className="block text-sm font-medium text-stone-700 mb-2">
            Número de pedido
          </label>
          <div className="flex gap-2">
            <input
              id="orderNumber"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ej: 1234"
              className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!orderNumber.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Ingresá el número que recibiste en tu email de confirmación.
          </p>
        </form>
      </div>
    </div>
  );
}
