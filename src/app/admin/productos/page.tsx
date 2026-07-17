'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  listProductsWithCost,
  snapshotProductCosts,
  toggleProductActive,
  type ProductWithCost,
} from '@/actions/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';
import { Plus, Pencil, ImageIcon, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

function CostVariation({ product }: { product: ProductWithCost }) {
  const prev = product.cost_prev;
  const curr = product.cost_snapshot;
  if (prev == null || curr == null || prev <= 0) {
    return <span className="text-stone-300">—</span>;
  }
  const pct = ((curr - prev) / prev) * 100;
  const up = pct > 0;
  const flat = Math.abs(pct) < 0.05;
  return (
    <div className="flex flex-col">
      <span
        className={`inline-flex items-center gap-0.5 font-medium ${
          flat ? 'text-stone-500' : up ? 'text-red-600' : 'text-emerald-600'
        }`}
      >
        {!flat && (up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        {up ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
      {product.cost_snapshot_at && (
        <span className="text-xs text-stone-400">{formatDate(product.cost_snapshot_at)}</span>
      )}
    </div>
  );
}

export default function ProductosPage() {
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await listProductsWithCost();
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

  const handleRefreshCosts = async () => {
    setRefreshing(true);
    await snapshotProductCosts();
    await load();
    setRefreshing(false);
    toast.success('Costos actualizados');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Productos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefreshCosts} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar costos
          </Button>
          <Button asChild>
            <Link href="/admin/productos/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo producto
            </Link>
          </Button>
        </div>
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
                  <th className="px-4 py-3 text-left font-medium text-stone-500 w-16">Foto</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Nombre</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Costo</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Precio</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Margen</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Var. costo</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {products.map((product) => {
                  const hasCost = product.unit_cost > 0;
                  const margin = product.price - product.unit_cost;
                  const marginPct = product.price > 0 ? (margin / product.price) * 100 : 0;
                  return (
                    <tr key={product.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-md object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-stone-100 border border-stone-200">
                            <ImageIcon className="h-5 w-5 text-stone-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {product.name}
                        <span className="block text-xs text-stone-400">
                          {product.category?.name || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-stone-900">
                        {hasCost ? formatPrice(product.unit_cost) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-900">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3 text-right">
                        {hasCost ? (
                          <span className={margin >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            {formatPrice(margin)}
                            <span className="block text-xs text-stone-400">{marginPct.toFixed(0)}%</span>
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CostVariation product={product} />
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
