import { ProductForm } from '@/components/admin/products/product-form';
import { listAllCategories } from '@/actions/categories';

export default async function NuevoProductoPage() {
  const categories = await listAllCategories();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Nuevo producto</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
