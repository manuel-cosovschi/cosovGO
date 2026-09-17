import { ProductDetailView } from '@/components/catalog/product-detail-view';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TiendaProductPage({ params }: Props) {
  const { slug } = await params;
  return (
    <ProductDetailView slug={slug} canal="minorista" backLabel="Volver a la tienda" />
  );
}
