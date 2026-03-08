import { notFound } from 'next/navigation';
import { PackageForm } from '@/components/admin/packages/package-form';
import { getPackageById } from '@/actions/packages';
import { listAllProducts } from '@/actions/products';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarPaquetePage({ params }: Props) {
  const { id } = await params;
  const [pkg, products] = await Promise.all([
    getPackageById(id),
    listAllProducts(),
  ]);

  if (!pkg) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Editar paquete</h1>
      <PackageForm pkg={pkg} products={products} />
    </div>
  );
}
