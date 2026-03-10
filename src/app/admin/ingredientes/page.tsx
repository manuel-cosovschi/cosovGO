'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listIngredients } from '@/actions/ingredients';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Ingredient } from '@/types';
import { Plus, Pencil, AlertTriangle } from 'lucide-react';

export default function IngredientesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await listIngredients();
    setIngredients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Ingredientes</h1>
        <Button asChild>
          <Link href="/admin/ingredientes/nuevo">
            <Plus className="mr-2 h-4 w-4" /> Nuevo ingrediente
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
          </div>
        ) : ingredients.length === 0 ? (
          <p className="px-6 py-16 text-center text-stone-500">No hay ingredientes cargados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Mínimo</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Costo/u</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Proveedor</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {ingredients.map((ing) => {
                  const isLow = ing.stock_quantity < ing.min_stock_quantity;
                  return (
                    <tr key={ing.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-stone-900">
                        <div className="flex items-center gap-2">
                          {ing.name}
                          {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${isLow ? 'text-red-600 font-medium' : 'text-stone-900'}`}>
                        {ing.stock_quantity} {ing.unit}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {ing.min_stock_quantity} {ing.unit}
                      </td>
                      <td className="px-4 py-3 text-stone-900">
                        ${ing.cost_per_unit}/{ing.unit}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{ing.supplier || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ing.is_active ? 'default' : 'secondary'}>
                          {ing.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/ingredientes/${ing.id}`}>
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
