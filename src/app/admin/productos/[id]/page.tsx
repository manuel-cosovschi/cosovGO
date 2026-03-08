import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/products/product-form';
import { getProductById } from '@/actions/products';
import { listAllCategories } from '@/actions/categories';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    listAllCategories(),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Editar producto</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
