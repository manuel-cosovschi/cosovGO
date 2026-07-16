import { listIngredients } from '@/actions/ingredients';
import { formatPrice } from '@/lib/utils';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function InventarioPage() {
  const ingredients = await listIngredients(true);

  const withValue = ingredients
    .map((ing) => ({
      ...ing,
      value: Math.round(ing.stock_quantity * ing.cost_per_unit * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);

  const total = withValue.reduce((sum, ing) => sum + ing.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Inventario</h1>
        <p className="text-sm text-stone-500">
          Valor de la materia prima según el stock que cargás
        </p>
      </div>

      {/* Total value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-stone-500">
            Valor total en ingredientes
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatPrice(total)}</div>
          <p className="text-xs text-stone-500">
            Suma de stock × costo por unidad de cada ingrediente activo
          </p>
        </CardContent>
      </Card>

      {/* Detail per ingredient */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-200 px-6 py-4">
          <h2 className="font-semibold text-stone-900">Detalle por ingrediente</h2>
        </div>
        {withValue.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-stone-500">
            No hay ingredientes cargados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Ingrediente</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Costo/u</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {withValue.map((ing) => (
                  <tr key={ing.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{ing.name}</td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {ing.stock_quantity} {ing.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {formatPrice(ing.cost_per_unit)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-900">
                      {formatPrice(ing.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-stone-200 bg-stone-50">
                <tr>
                  <td className="px-4 py-3 font-semibold text-stone-900" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-stone-900">
                    {formatPrice(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
