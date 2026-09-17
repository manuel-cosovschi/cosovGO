import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  package_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  notes: z.string().optional(),
}).refine(
  (data) => data.product_id || data.package_id,
  { message: 'Cada item debe tener un producto o un paquete' }
);

export const orderSchema = z.object({
  /** Catálogo del que viene el pedido. Define precios y qué datos se piden. */
  canal: z.enum(['mayorista', 'minorista']).default('mayorista'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  phone: z.string().min(6, 'El teléfono es obligatorio'),
  // A un particular solo se le pide nombre y teléfono; el mail es opcional y
  // solo sirve para mandarle la confirmación y el seguimiento.
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  delivery_method: z.enum(['pickup', 'delivery'], {
    required_error: 'Seleccioná un método de entrega',
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  delivery_date: z
    .string()
    .min(1, 'La fecha de entrega es obligatoria')
    .refine(
      (v) => {
        // Parse YYYY-MM-DD como fecha local (no UTC) y comparar contra hoy local.
        const [y, m, d] = v.split('-').map(Number);
        if (!y || !m || !d) return false;
        const picked = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return picked.getTime() >= today.getTime();
      },
      { message: 'La fecha de entrega no puede ser anterior a hoy' }
    ),
  observations: z.string().optional(),
  requires_invoice: z.boolean().optional(),
  invoice_data: z.record(z.unknown()).optional(),
  items: z.array(orderItemSchema).min(1, 'El pedido debe tener al menos un producto'),
}).refine(
  (data) => {
    if (data.delivery_method === 'delivery') {
      return !!data.address && data.address.length > 0;
    }
    return true;
  },
  {
    message: 'La dirección es obligatoria para envíos a domicilio',
    path: ['address'],
  }
).refine(
  // A las cafeterías sí se les exige mail: es por donde les llega el
  // comprobante y el aviso de aprobación.
  (data) => data.canal === 'minorista' || !!data.email,
  { message: 'El email es obligatorio', path: ['email'] }
);

export type OrderFormValues = z.infer<typeof orderSchema>;

/**
 * Pedido cargado a mano por Valen desde el panel (los que le llegan por
 * WhatsApp). Es más permisivo que el de la web:
 *
 * - El mail es opcional: un particular muchas veces no lo deja.
 * - El negocio es opcional: un particular no tiene.
 * - El precio de cada línea se puede pisar, porque a un minorista le cobra
 *   distinto que a una cafetería.
 * - La fecha puede ser pasada: a veces carga un pedido ya entregado.
 */
export const manualOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unit_price: z.number().nonnegative('El precio no puede ser negativo'),
});

export const manualOrderSchema = z.object({
  canal: z.enum(['minorista', 'mayorista']),
  contact_name: z.string().min(1, 'El nombre del cliente es obligatorio'),
  business_name: z.string().optional(),
  phone: z.string().min(6, 'El teléfono es obligatorio'),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  delivery_method: z.enum(['pickup', 'delivery']),
  address: z.string().optional(),
  delivery_date: z.string().min(1, 'La fecha de entrega es obligatoria'),
  observations: z.string().optional(),
  status: z.enum(['received', 'approved']),
  items: z
    .array(manualOrderItemSchema)
    .min(1, 'El pedido debe tener al menos un producto'),
}).refine(
  (data) => data.delivery_method !== 'delivery' || !!data.address?.trim(),
  { message: 'La dirección es obligatoria para envíos a domicilio', path: ['address'] }
);

export type ManualOrderValues = z.infer<typeof manualOrderSchema>;
