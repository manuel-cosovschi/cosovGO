import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-stone-900">COSOV.</h3>
            <p className="mt-2 text-sm text-stone-500">
              Pastelería artesanal para cafeterías, locales y eventos.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-stone-900">Navegación</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/catalogo" className="text-sm text-stone-500 hover:text-stone-900">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/paquetes" className="text-sm text-stone-500 hover:text-stone-900">
                  Paquetes
                </Link>
              </li>
              <li>
                <Link href="/pedido" className="text-sm text-stone-500 hover:text-stone-900">
                  Hacer Pedido
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-stone-900">Importante</h4>
            <p className="mt-3 text-sm text-stone-500">
              Los pedidos deben realizarse con un mínimo de <strong>48 horas de anticipación</strong> para
              garantizar disponibilidad y calidad.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-200 pt-8 text-center">
          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} COSOV. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
