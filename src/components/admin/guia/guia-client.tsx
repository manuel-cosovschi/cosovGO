'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  Package,
  BoxesIcon,
  TagIcon,
  Egg,
  BarChart3,
  Settings,
  ChevronDown,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  detail?: string;
}

interface Section {
  id: string;
  icon: LucideIcon;
  title: string;
  para: string;
  pasos: Step[];
  tips?: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    para: 'Es la pantalla principal. De un vistazo ves cómo viene el día: cuántos pedidos hay, cuáles están pendientes de revisar, qué está en producción y qué está listo para entregar.',
    pasos: [
      { title: 'Mirá las tarjetas de arriba', detail: 'Te muestran los números del día y de la semana: pedidos nuevos, pendientes, en producción y listos.' },
      { title: 'Revisá las alertas de stock', detail: 'Si algún ingrediente está por agotarse, aparece un aviso amarillo. Hacé click en "Ver inventario" para ver el detalle.' },
      { title: 'Mirá los últimos pedidos', detail: 'Abajo de todo está la lista de los pedidos más recientes. Tocá cualquiera para abrirlo.' },
    ],
    tips: ['Es el primer lugar donde entrar cada mañana para saber qué hay que hacer.'],
  },
  {
    id: 'movimientos',
    icon: TrendingUp,
    title: 'Movimientos',
    para: 'Es la plata del negocio, mes a mes. Replica lo que antes llevabas en la planilla de Google: qué se vendió, qué se cobró, qué se gastó y cuánto quedó de ganancia.',
    pasos: [
      { title: 'Elegí el mes', detail: 'Con las flechitas de arriba te movés entre meses (mayo, junio, etc.).' },
      { title: 'Pestaña "Pedidos del Mes"', detail: 'Lista todos los pedidos. Marcá cada uno como "Cobrado" cuando te paguen, y podés anotar la fecha y la forma de pago.' },
      { title: 'Pestaña "Gastos del Negocio"', detail: 'Cargá cada gasto (materia prima, packaging, envíos, etc.) con el botón de nuevo gasto. Después podés borrarlos si te equivocaste.' },
      { title: 'Pestaña "Resumen"', detail: 'Te muestra los totales: cuánto vendiste, cuánto cobraste, cuánto está pendiente, los gastos y la ganancia final.' },
    ],
    tips: [
      'Lo que marcás como "cobrado" acá se usa para calcular cuánta plata todavía te deben.',
      'Cargá los gastos a medida que pasan así el resumen siempre está al día.',
    ],
  },
  {
    id: 'pedidos',
    icon: ClipboardList,
    title: 'Pedidos',
    para: 'El corazón del sistema. Acá entran todos los pedidos que hacen los clientes desde la web y vos los vas moviendo por sus etapas hasta entregarlos.',
    pasos: [
      { title: 'Abrí un pedido', detail: 'Tocá cualquier pedido de la lista para ver el detalle: datos del cliente, qué pidió, fecha de entrega y total.' },
      { title: 'Aprobá el pedido', detail: 'Cuando lo revisás y está todo bien, tocá "Aprobar pedido". Ahí podés cargar el costo de envío si corresponde.' },
      { title: 'Descargá el comprobante', detail: 'Con el botón "Descargar comprobante" se genera un PDF con el logo de COSOV y el detalle del pedido. Ese se lo mandás al cliente.' },
      { title: 'Seguí cambiando el estado', detail: 'A medida que avanza, andá marcando: en producción → listo → enviado → entregado.' },
    ],
    tips: [
      'El costo de envío que cargás al aprobar se suma automáticamente al comprobante.',
      'Cada cambio de estado le avisa al cliente por email.',
    ],
  },
  {
    id: 'productos',
    icon: Package,
    title: 'Productos',
    para: 'El catálogo de todo lo que vendés: alfajores, tortas, budines, etc. Lo que cargás acá es lo que los clientes ven en la web para pedir.',
    pasos: [
      { title: 'Creá un producto', detail: 'Tocá "Nuevo producto", ponele nombre, descripción, precio y una foto.' },
      { title: 'Editá cuando cambie algo', detail: 'Si cambia un precio o querés actualizar la foto, abrí el producto y editalo.' },
      { title: 'Activá o desactivá', detail: 'Si algo no lo estás vendiendo por ahora, lo podés desactivar para que no aparezca en la web, sin borrarlo.' },
    ],
    tips: ['Una buena foto y una descripción clara hacen que el cliente se decida más fácil.'],
  },
  {
    id: 'paquetes',
    icon: BoxesIcon,
    title: 'Paquetes',
    para: 'Son combos: varios productos juntos a un precio especial. Por ejemplo, una caja de regalo con surtido de alfajores.',
    pasos: [
      { title: 'Creá un paquete', detail: 'Tocá "Nuevo paquete", ponele nombre y precio.' },
      { title: 'Agregá los productos', detail: 'Elegí qué productos lleva y en qué cantidad.' },
      { title: 'Publicalo', detail: 'Una vez activo, el cliente lo puede pedir como si fuera un producto más.' },
    ],
  },
  {
    id: 'categorias',
    icon: TagIcon,
    title: 'Categorías',
    para: 'Sirven para ordenar el catálogo. Agrupan los productos por tipo (por ejemplo: Alfajores, Tortas, Sin TACC) para que el cliente encuentre más fácil.',
    pasos: [
      { title: 'Creá una categoría', detail: 'Ponele un nombre claro, como "Tortas" o "Budines".' },
      { title: 'Asigná productos', detail: 'Cuando creás o editás un producto, le elegís a qué categoría pertenece.' },
    ],
  },
  {
    id: 'ingredientes',
    icon: Egg,
    title: 'Ingredientes',
    para: 'La materia prima que usás para producir: harina, dulce de leche, manteca, etc. El sistema lleva el stock y el costo de cada uno.',
    pasos: [
      { title: 'Cargá un ingrediente', detail: 'Tocá "Nuevo ingrediente", ponele nombre, unidad (kg, litros, unidades), cuánto tenés y cuánto cuesta.' },
      { title: 'Definí el stock mínimo', detail: 'Indicá a partir de qué cantidad querés que te avise que se está por acabar.' },
      { title: 'Actualizá cuando comprás', detail: 'Cada vez que comprás más, actualizá la cantidad para que el stock quede bien.' },
    ],
    tips: ['El costo que cargás acá se usa para calcular cuánto te sale producir cada producto.'],
  },
  {
    id: 'inventario',
    icon: BarChart3,
    title: 'Inventario',
    para: 'La foto general de tu stock: cuánto vale todo lo que tenés guardado, qué está por agotarse y qué conviene comprar.',
    pasos: [
      { title: 'Mirá la valorización', detail: 'Te dice cuánta plata tenés "invertida" en ingredientes y productos elaborados.' },
      { title: 'Revisá las alertas', detail: 'Lista lo que está por debajo del stock mínimo y necesita reposición.' },
      { title: 'Usá las sugerencias de compra', detail: 'El sistema te arma una lista de qué comprar y cuánto, según lo que falta.' },
    ],
  },
  {
    id: 'configuracion',
    icon: Settings,
    title: 'Configuración',
    para: 'Los datos básicos del negocio: el nombre, el teléfono y el email donde te llegan los avisos de pedidos nuevos.',
    pasos: [
      { title: 'Revisá los datos', detail: 'Asegurate de que el email esté bien, porque ahí te llegan las notificaciones de cada pedido nuevo.' },
      { title: 'Guardá los cambios', detail: 'Cuando edités algo, tocá "Guardar configuración".' },
    ],
  },
];

function SectionCard({ section, defaultOpen }: { section: Section; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = section.icon;

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-stone-900">{section.title}</h2>
          <p className="text-sm text-stone-500 line-clamp-1">{section.para}</p>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 flex-shrink-0 text-stone-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1">
              ¿Para qué sirve?
            </p>
            <p className="text-sm text-stone-700">{section.para}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
              Cómo usarla
            </p>
            <ol className="space-y-2.5">
              {section.pasos.map((paso, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{paso.title}</p>
                    {paso.detail && (
                      <p className="text-sm text-stone-500">{paso.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {section.tips && section.tips.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">
                💡 Tips
              </p>
              <ul className="space-y-1">
                {section.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-900">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GuiaClient() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Guía de uso</h1>
        <p className="text-sm text-stone-500">
          Una explicación simple de cada sección de COSOV y cómo usarla. Tocá cada
          tarjeta para desplegar el detalle.
        </p>
      </div>

      {/* Flujo recomendado */}
      <div className="rounded-lg border border-stone-200 bg-stone-900 px-5 py-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5" />
          <h2 className="font-semibold">El flujo de un pedido, paso a paso</h2>
        </div>
        <p className="text-sm text-stone-300 mb-3">
          El recorrido típico desde que entra un pedido hasta que lo entregás:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            'Entra el pedido',
            'Lo revisás y aprobás',
            'Cargás el envío',
            'Descargás el comprobante',
            'Producción',
            'Listo / Enviado',
            'Entregado',
            'Marcás cobrado',
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 font-medium">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-stone-500">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Secciones */}
      <div className="space-y-3">
        {SECTIONS.map((section, i) => (
          <SectionCard key={section.id} section={section} defaultOpen={i === 0} />
        ))}
      </div>

      <p className="text-center text-xs text-stone-400 pt-2">
        ¿Te quedó alguna duda con una sección? Avisanos y la agregamos a la guía.
      </p>
    </div>
  );
}
