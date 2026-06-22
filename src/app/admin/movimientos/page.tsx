import { getOrdersForMonth, getGastosForMonth } from '@/actions/movimientos';
import { MovimientosClient } from '@/components/admin/movimientos/movimientos-client';

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  const mesParam = params.mes;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split('-').map(Number);
    if (y > 2020 && m >= 1 && m <= 12) {
      year = y;
      month = m;
    }
  }

  const [orders, gastos] = await Promise.all([
    getOrdersForMonth(year, month),
    getGastosForMonth(year, month),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Movimientos</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pedidos, gastos y resumen mensual — idéntico a Google Sheets
        </p>
      </div>
      <MovimientosClient
        orders={orders}
        gastos={gastos}
        year={year}
        month={month}
      />
    </div>
  );
}
