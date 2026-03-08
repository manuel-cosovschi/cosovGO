import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getActivePackages } from '@/actions/catalog';
import { PackageCard } from '@/components/catalog/package-card';

export default async function PaquetesPage() {
  const packages = await getActivePackages();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Paquetes y Combos</h1>
        <p className="mt-2 text-stone-500">
          Combos armados para cafeterías y eventos.
        </p>

        <div className="mt-8">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-4">📦</span>
              <p className="text-stone-500">No hay paquetes disponibles por el momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
