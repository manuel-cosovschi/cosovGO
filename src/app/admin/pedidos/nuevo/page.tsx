import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listAllProducts } from '@/actions/products';
import {
  ManualOrderForm,
  type PickableProduct,
} from '@/components/admin/orders/manual-order-form';

export default async function NuevoPedidoPage() {
  const products = await listAllProducts({ is_active: true });

  const pickable: PickableProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    sale_unit: p.sale_unit,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver a pedidos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-stone-900">Cargar pedido a mano</h1>
        <p className="text-sm text-stone-500">
          Para los pedidos que te llegan por WhatsApp. Quedan registrados igual
          que los que entran por la página.
        </p>
      </div>

      <ManualOrderForm products={pickable} />
    </div>
  );
}
