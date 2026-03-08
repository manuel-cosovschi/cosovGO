'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAllProducts, toggleProductActive } from '@/actions/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await listAllProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string) => {
    const result = await toggleProductActive(id);
    if (result.success) {
      toast.success('Estado actualizado');
      load();
    } else {
      toast.error(result.error || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Productos</h1>
        <Button asChild>
          <Link href="/admin/productos/nuevo">
            <Plus className="mr-2 h-4 w-4" /> Nuevo producto
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
          </div>
        ) : products.length === 0 ? (
          <p className="px-6 py-16 text-center text-stone-500">No hay productos creados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Precio</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{product.name}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {product.category?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-900">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(product.id)}>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/productos/${product.id}`}>
                          <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
