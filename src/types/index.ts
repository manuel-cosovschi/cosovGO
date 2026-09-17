// === Enums y constantes ===

/**
 * Estados de un pedido, en el orden en que ocurren.
 *
 * Son a propósito pocos: antes había 10 y dos ("Pendiente de revisión" y
 * "Activo") nunca se usaron en 174 pedidos. "Enviado" se fusionó con
 * "Entregado" y "Rechazado" con "Cancelado", que para Valen significan
 * lo mismo.
 */
export const ORDER_STATUSES = [
  'received',
  'approved',
  'in_production',
  'ready',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Recibido',
  approved: 'Aprobado',
  in_production: 'En producción',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  in_production: 'bg-orange-100 text-orange-800',
  ready: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-stone-200 text-stone-700',
  cancelled: 'bg-red-100 text-red-800',
};

/**
 * Estados que ya no se pueden asignar pero siguen apareciendo en el historial
 * de pedidos viejos. Solo se usan para mostrar una etiqueta legible.
 */
export const LEGACY_ORDER_STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pendiente de revisión',
  active: 'Activo',
  shipped: 'Enviado',
  rejected: 'Rechazado',
};

/** Etiqueta de un estado, tolerante con los valores viejos del historial. */
export function orderStatusLabel(status: string): string {
  return (
    ORDER_STATUS_LABELS[status as OrderStatus] ??
    LEGACY_ORDER_STATUS_LABELS[status] ??
    status
  );
}

/**
 * Pedidos cerrados: ya no se editan sus productos.
 * En cualquier otro estado — aprobado incluido — Valen puede seguir tocándolos,
 * porque a veces el cliente pide un cambio después de que ella aprobó.
 */
export const CLOSED_ORDER_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];

export function canEditOrderItems(status: string): boolean {
  return !CLOSED_ORDER_STATUSES.includes(status as OrderStatus);
}

/**
 * Estados que cuentan como venta confirmada (Movimientos, resumen, Sheets).
 * Incluye los valores viejos por si algún pedido todavía no fue migrado.
 */
export const CONFIRMED_ORDER_STATUSES: string[] = [
  'approved',
  'in_production',
  'ready',
  'delivered',
  // Legacy — equivalentes a los de arriba antes de la simplificación.
  'active',
  'shipped',
];

/**
 * Valen puede mover un pedido a cualquier estado, también hacia atrás: es la
 * única que los administra y necesita poder corregirse. El state machine
 * rígido que había antes solo le bloqueaba el paso.
 */
export function isValidOrderStatus(status: string): status is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}

export const DELIVERY_METHODS = ['pickup', 'delivery'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  pickup: 'Retiro en local',
  delivery: 'Envío a domicilio',
};

// === Entidades ===

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  ingredients: string | null;
  price: number;
  cost_override: number | null;
  image_url: string | null;
  gallery_urls: string[];
  is_active: boolean;
  sale_unit: string;
  min_quantity: number;
  /** Los pedidos deben ser múltiplos de este número (ej: brownies de a 12). */
  sale_multiple: number;
  min_advance_hours: number | null;
  sort_order: number;
  // Seguimiento de costo (se completa al actualizar materia prima / receta)
  cost_snapshot: number | null;
  cost_snapshot_at: string | null;
  cost_prev: number | null;
  cost_prev_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Package {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_editable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageItem {
  id: string;
  package_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface PackageDetail extends Package {
  items: PackageItem[];
}

export interface Order {
  id: string;
  order_number: number;
  status: OrderStatus;
  /** Puede venir vacío en pedidos de particulares cargados a mano. */
  business_name: string | null;
  contact_name: string;
  phone: string;
  /** Opcional: un particular que pide por WhatsApp muchas veces no deja mail. */
  email: string | null;
  /** A quién le vendió. Los pedidos de la web son siempre mayoristas. */
  canal: 'mayorista' | 'minorista';
  /** true si lo cargó Valen desde el panel en vez de entrar solo por la web. */
  carga_manual: boolean;
  delivery_method: DeliveryMethod;
  address: string | null;
  city: string | null;
  delivery_date: string;
  time_slot: string | null;
  observations: string | null;
  requires_invoice: boolean;
  invoice_data: Record<string, unknown> | null;
  subtotal: number;
  production_cost: number | null;
  admin_notes: string | null;
  cobrado: boolean;
  fecha_cobro: string | null;
  forma_pago: string | null;
  costo_envio: number | null;
  created_at: string;
  updated_at: string;
}

export const GASTO_CATEGORIAS = [
  'Materia prima',
  'Sueldos',
  'Packaging',
  'Envíos',
  'Servicios',
  'Equipamiento',
  'Personal',
  'Papelera',
  'Otros',
] as const;
export type GastoCategoria = (typeof GASTO_CATEGORIAS)[number];

export interface Gasto {
  id: string;
  fecha: string;
  categoria: string;
  proveedor: string | null;
  monto: number;
  forma_pago: string | null;
  nota: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGastoInput {
  fecha: string;
  categoria: string;
  proveedor?: string;
  monto: number;
  forma_pago?: string;
  nota?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  package_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  unit_cost: number | null;
  cost_subtotal: number | null;
  notes: string | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  status_history: OrderStatusHistory[];
}

// === Inputs ===

export interface CreateOrderInput {
  name: string;
  phone: string;
  email: string;
  delivery_method: DeliveryMethod;
  address?: string;
  city?: string;
  delivery_date: string;
  observations?: string;
  requires_invoice?: boolean;
  invoice_data?: Record<string, unknown>;
  items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
  product_id?: string;
  package_id?: string;
  quantity: number;
  notes?: string;
}

export interface CreateProductInput {
  name: string;
  category_id?: string;
  short_description?: string;
  long_description?: string;
  ingredients?: string;
  price: number;
  image_url?: string;
  gallery_urls?: string[];
  sale_unit?: string;
  min_quantity?: number;
  sale_multiple?: number;
  min_advance_hours?: number | null;
  is_active?: boolean;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface CreatePackageInput {
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  is_editable?: boolean;
  is_active?: boolean;
  items: { product_id: string; quantity: number }[];
}

export interface UpdatePackageInput extends Partial<Omit<CreatePackageInput, 'items'>> {
  items?: { product_id: string; quantity: number }[];
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  is_active?: boolean;
}

// === Filtros ===

export interface OrderFilters {
  status?: OrderStatus;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ProductFilters {
  category_id?: string;
  is_active?: boolean;
  search?: string;
}

// === Inventario / Stock ===

export const STOCK_UNITS = ['kg', 'g', 'l', 'ml', 'unidad', 'docena', 'caja', 'paquete'] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

export const MOVEMENT_TYPES = [
  'purchase',
  'production',
  'order_deduction',
  'production_consumption',
  'adjustment',
  'waste',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  purchase: 'Compra',
  production: 'Producción',
  order_deduction: 'Pedido',
  production_consumption: 'Consumo producción',
  adjustment: 'Ajuste manual',
  waste: 'Merma / pérdida',
};

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  min_stock_quantity: number;
  cost_per_unit: number;
  supplier: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity_per_batch: number;
  ingredient?: Ingredient;
}

export interface StockMovement {
  id: string;
  reference_type: 'ingredient' | 'product';
  reference_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  order_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateIngredientInput {
  name: string;
  unit: string;
  stock_quantity?: number;
  min_stock_quantity?: number;
  cost_per_unit?: number;
  supplier?: string;
  notes?: string;
}

export interface UpdateIngredientInput extends Partial<CreateIngredientInput> {
  is_active?: boolean;
}

export interface StockAdjustment {
  new_quantity: number;
  notes: string;
}

export interface StockAlert {
  type: 'low_ingredient' | 'low_product' | 'missing_recipe' | 'ingredient_needed';
  severity: 'warning' | 'critical';
  message: string;
  reference_id: string;
  reference_name: string;
}

export interface InventoryValuation {
  ingredients_value: number;
  products_value: number;
  committed_cost: number;
  total_value: number;
}

export interface PurchaseSuggestion {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  current_stock: number;
  needed: number;
  to_buy: number;
  estimated_cost: number;
}

// === Dashboard ===

export interface DashboardStats {
  orders_today: number;
  orders_this_week: number;
  pending_review: number;
  in_production: number;
  ready_for_delivery: number;
  recent_orders: Order[];
  // v2: stock
  alerts?: StockAlert[];
  valuation?: InventoryValuation;
  low_ingredients_count?: number;
  low_products_count?: number;
}

// === Carrito (client-side) ===

export interface CartItem {
  id: string;
  type: 'product' | 'package';
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  min_advance_hours: number | null;
  sale_unit: string;
  /** Cantidad mínima que se puede pedir (default 1). */
  min_quantity?: number;
  /** El pedido debe ser múltiplo de este número (default 1). */
  sale_multiple?: number;
}

// === Tracking de pedido (público) ===

export interface OrderTracking {
  order_number: number;
  status: OrderStatus;
  business_name: string;
  delivery_date: string;
  delivery_method: DeliveryMethod;
  items: { name: string; quantity: number; unit_price: number; subtotal: number }[];
  subtotal: number;
  timeline: { status: string; date: string; notes: string | null }[];
  created_at: string;
}
