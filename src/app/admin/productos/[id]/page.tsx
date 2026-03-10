import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/products/product-form';
import { RecipeManager } from '@/components/admin/products/recipe-manager';
import { ProductStockManager } from '@/components/admin/products/product-stock-manager';
import { getProductById } from '@/actions/products';
import { listAllCategories } from '@/actions/categories';
import { getProductRecipe, listIngredients } from '@/actions/ingredients';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;
  const [product, categories, recipe, ingredients] = await Promise.all([
    getProductById(id),
    listAllCategories(),
    getProductRecipe(id),
    listIngredients(true),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Editar producto</h1>
      <ProductForm product={product} categories={categories} />

      {/* Stock Management */}
      <ProductStockManager product={product} />

      {/* Recipe Management */}
      <RecipeManager
        productId={product.id}
        productName={product.name}
        batchSize={(product as unknown as { batch_size: number }).batch_size || 1}
        currentRecipe={recipe}
        availableIngredients={ingredients}
      />
    </div>
  );
}
