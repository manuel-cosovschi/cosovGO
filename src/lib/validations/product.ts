import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  category_id: z.string().uuid().optional().nullable(),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  ingredients: z.string().optional(),
  price: z.number().positive('El precio debe ser mayor a 0'),
  cost_override: z
    .union([z.number().nonnegative('El costo no puede ser negativo'), z.nan()])
    .optional()
    .nullable()
    .transform((v) => (v == null || Number.isNaN(v) ? null : v)),
  // === Canal minorista ===
  // Sin precio minorista el producto no aparece en la tienda: así nadie compra
  // por error a precio de cafetería.
  price_minorista: z
    .union([z.number().nonnegative('El precio no puede ser negativo'), z.nan()])
    .optional()
    .nullable()
    .transform((v) => (v == null || Number.isNaN(v) ? null : v)),
  visible_mayorista: z.boolean().default(true),
  visible_minorista: z.boolean().default(true),
  min_quantity_minorista: z.number().int().min(1).default(1),
  sale_multiple_minorista: z.number().int().min(1).default(1),
  image_url: z.string().url().optional().nullable(),
  gallery_urls: z.array(z.string().url()).optional(),
  sale_unit: z.string().default('unidad'),
  min_quantity: z.number().int().min(1).default(1),
  sale_multiple: z.number().int().min(1).default(1),
  min_advance_hours: z.number().int().min(1).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;
