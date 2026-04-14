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
  name: z.string().min(1, 'El nombre es obligatorio'),
  phone: z.string().min(6, 'El teléfono es obligatorio'),
  email: z.string().email('Email inválido'),
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
);

export type OrderFormValues = z.infer<typeof orderSchema>;
