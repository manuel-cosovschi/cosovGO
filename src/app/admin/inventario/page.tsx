import Link from 'next/link';
import { generateStockAlerts, getInventoryValuation, getPurchaseSuggestions } from '@/actions/inventory';
import { formatPrice } from '@/lib/utils';
import { AlertTriangle, DollarSign, TrendingDown, Package, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function InventarioPage() {
  const [alerts, valuation, suggestions] = await Promise.all([
    generateStockAlerts(),
    getInventoryValuation(),
    getPurchaseSuggestions(),
  ]);

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Inventario</h1>
        <p className="text-sm text-stone-500">Valorización, alertas y sugerencias de compra</p>
      </div>

      {/* Valuation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Ingredientes</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(valuation.ingredients_value)}</div>
            <p className="text-xs text-stone-500">Valor del stock de materia prima</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Productos</CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(valuation.products_value)}</div>
            <p className="text-xs text-stone-500">Valor estimado de elaborados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Total inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-stone-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(valuation.total_value)}</div>
            <p className="text-xs text-stone-500">Ingredientes + elaborados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Comprometido</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(valuation.committed_cost)}</div>
            <p className="text-xs text-stone-500">Pedidos aprobados/producción</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-6 py-4">
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas ({alerts.length})
            </h2>
          </div>
          <div className="divide-y divide-stone-100">
            {criticalAlerts.map((alert, i) => (
              <div key={`c-${i}`} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-sm text-stone-900">{alert.message}</p>
                </div>
                {(alert.type === 'low_ingredient') && (
                  <Link href={`/admin/ingredientes/${alert.reference_id}`} className="text-xs text-stone-500 hover:text-stone-900">
                    Ver
                  </Link>
                )}
                {(alert.type === 'low_product' || alert.type === 'missing_recipe') && (
                  <Link href={`/admin/productos/${alert.reference_id}`} className="text-xs text-stone-500 hover:text-stone-900">
                    Ver
                  </Link>
                )}
              </div>
            ))}
            {warningAlerts.map((alert, i) => (
              <div key={`w-${i}`} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <p className="text-sm text-stone-900">{alert.message}</p>
                </div>
                {(alert.type === 'low_ingredient') && (
                  <Link href={`/admin/ingredientes/${alert.reference_id}`} className="text-xs text-stone-500 hover:text-stone-900">
                    Ver
                  </Link>
                )}
                {(alert.type === 'low_product' || alert.type === 'missing_recipe') && (
                  <Link href={`/admin/productos/${alert.reference_id}`} className="text-xs text-stone-500 hover:text-stone-900">
                    Ver
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-white px-6 py-8 text-center">
          <p className="text-sm text-stone-500">Todo en orden. No hay alertas de stock.</p>
        </div>
      )}

      {/* Purchase Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-6 py-4">
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Sugerencia de compra
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Ingredientes por debajo del stock mínimo
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Ingrediente</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Actual</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Mínimo</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Comprar</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Costo est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {suggestions.map((s) => (
                  <tr key={s.ingredient_id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{s.ingredient_name}</td>
                    <td className="px-4 py-3 text-red-600">{s.current_stock} {s.unit}</td>
                    <td className="px-4 py-3 text-stone-500">{s.needed} {s.unit}</td>
                    <td className="px-4 py-3 font-medium text-stone-900">{s.to_buy} {s.unit}</td>
                    <td className="px-4 py-3 text-stone-900">{formatPrice(s.estimated_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-stone-200 px-6 py-3 text-right">
            <p className="text-sm font-medium text-stone-900">
              Total estimado: {formatPrice(suggestions.reduce((sum, s) => sum + s.estimated_cost, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
