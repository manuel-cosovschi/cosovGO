import { CatalogView } from '@/components/catalog/catalog-view';

export const metadata = {
  title: 'Tienda — COSOV.',
  description: 'Pastelería artesanal. Hacé tu pedido online.',
};

export default function TiendaPage() {
  return (
    <CatalogView
      canal="minorista"
      title="Tienda"
      subtitle="Elegí lo que quieras y hacé tu pedido."
    />
  );
}
