import type { Product } from '@/types';
import type { Canal } from '@/lib/canal';
import { ProductCard } from './product-card';

interface ProductGridProps {
  products: Product[];
  canal?: Canal;
}

export function ProductGrid({ products, canal = 'mayorista' }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-4">🍪</span>
        <p className="text-stone-500">No hay productos disponibles en esta categoría.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} canal={canal} />
      ))}
    </div>
  );
}
