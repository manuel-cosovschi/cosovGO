// === Enums y constantes ===

export const ORDER_STATUSES = [
  'received',
  'pending_review',
  'approved',
  'rejected',
  'active',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Recibido',
  pending_review: 'Pendiente de revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  active: 'Activo',
  in_production: 'En producción',
  ready: 'Listo para entrega',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-indigo-100 text-indigo-800',
  in_production: 'bg-orange-100 text-orange-800',
  ready: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['pending_review', 'approved', 'rejected', 'cancelled'],
  pending_review: ['approved', 'rejected', 'cancelled'],
  approved: ['active', 'cancelled'],
  rejected: [],
  active: ['in_production', 'cancelled'],
  in_production: ['ready', 'cancelled'],
  ready: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

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
  image_url: string | null;
  gallery_urls: string[];
  is_active: boolean;
  sale_unit: string;
  min_quantity: number;
  min_advance_hours: number | null;
  sort_order: number;
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
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  delivery_method: DeliveryMethod;
  address: string | null;
  city: string | null;
  delivery_date: string;
  time_slot: string | null;
  observations: string | null;
  requires_invoice: boolean;
  invoice_data: Record<string, unknown> | null;
  subtotal: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
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
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  delivery_method: DeliveryMethod;
  address?: string;
  city?: string;
  delivery_date: string;
  time_slot?: string;
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
