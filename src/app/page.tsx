import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { getActiveCategories, getActiveProducts } from '@/actions/catalog';
import { ProductGrid } from '@/components/catalog/product-grid';
import { ArrowRight, Clock, Truck, ChefHat } from 'lucide-react';

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getActiveCategories(),
    getActiveProducts(),
  ]);

  const featuredProducts = products.slice(0, 4);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative bg-stone-50">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="max-w-2xl">
              <h1 className="font-serif text-5xl font-bold tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
                COSOV.
              </h1>
              <p className="mt-4 text-xl text-stone-600">
                Pastelería artesanal para cafeterías, locales y eventos.
              </p>
              <p className="mt-2 text-lg text-stone-500">
                Productos frescos, elaborados con ingredientes de calidad.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg">
                  <Link href="/catalogo">
                    Ver catálogo <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/paquetes">Ver paquetes</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Info cards */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-stone-100 p-3">
                  <Clock className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">48h de anticipación</h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Pedidos con mínimo 48 horas para garantizar frescura y disponibilidad.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-stone-100 p-3">
                  <ChefHat className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">Elaboración artesanal</h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Cada producto es preparado a mano con ingredientes seleccionados.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-stone-100 p-3">
                  <Truck className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">Entrega o retiro</h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Envío a domicilio o retiro en nuestro taller.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <h2 className="font-serif text-3xl font-bold text-stone-900">Categorías</h2>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/catalogo?categoria=${cat.slug}`}
                    className="flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 p-6 text-center font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:border-stone-300"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured products */}
        {featuredProducts.length > 0 && (
          <section className="bg-stone-50">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-3xl font-bold text-stone-900">Productos</h2>
                <Link
                  href="/catalogo"
                  className="text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                  Ver todos <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              <div className="mt-8">
                <ProductGrid products={featuredProducts} />
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-stone-900">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold text-white">
              ¿Listo para hacer tu pedido?
            </h2>
            <p className="mt-3 text-lg text-stone-300">
              Explorá nuestro catálogo y armá tu pedido en minutos.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-stone-900">
                <Link href="/catalogo">Empezar pedido</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
