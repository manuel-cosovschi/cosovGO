'use server';

import { createServerClient } from '@/lib/supabase/server';
import { orderSchema } from '@/lib/validations/order';
import { sendNewOrderNotification, sendOrderStatusUpdate } from '@/lib/emails';
import { appendOrderToSheets } from '@/lib/google-sheets';
import { getProductUnitCosts, getPackageUnitCosts } from '@/lib/production-cost';
import { quantityError } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { CreateOrderInput, Order, OrderDetail, OrderFilters, OrderStatus, OrderItem } from '@/types';
import { VALID_TRANSITIONS, ORDER_STATUS_LABELS } from '@/types';

export async function createOrder(input: CreateOrderInput): Promise<{
  success: boolean;
  order?: Order;
  error?: string;
}> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  const data = parsed.data;

  const supabase = await createServerClient();

  // Get product / package data for price snapshot
  const productIds = data.items.filter((i) => i.product_id).map((i) => i.product_id!);
  const packageIds = data.items.filter((i) => i.package_id).map((i) => i.package_id!);

  let productsData: {
    id: string;
    name: string;
    price: number;
    min_quantity: number;
    sale_multiple: number;
    sale_unit: string;
  }[] = [];
  let packagesData: { id: string; name: string; price: number }[] = [];

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, min_quantity, sale_multiple, sale_unit')
      .in('id', productIds);
    productsData = products || [];
  }

  if (packageIds.length > 0) {
    const { data: packages } = await supabase
      .from('packages')
      .select('id, name, price')
      .in('id', packageIds);
    packagesData = packages || [];
  }

  // Validate delivery address
  if (data.delivery_method === 'delivery' && !data.address) {
    return { success: false, error: 'La dirección es obligatoria para envíos a domicilio.' };
  }

  // Validate quantities (mínimo + venta por múltiplo) para productos
  const productById = new Map(productsData.map((p) => [p.id, p]));
  for (const item of data.items) {
    if (!item.product_id) continue;
    const prod = productById.get(item.product_id);
    if (!prod) continue;
    const err = quantityError(item.quantity, prod.min_quantity, prod.sale_multiple, prod.sale_unit);
    if (err) {
      return { success: false, error: `${prod.name}: ${err}` };
    }
  }

  // Build price map
  const priceMap = new Map<string, { name: string; price: number }>();
  productsData.forEach((p) => priceMap.set(p.id, { name: p.name, price: p.price }));
  packagesData.forEach((p) => priceMap.set(p.id, { name: p.name, price: p.price }));

  // Production cost map (per product/package)
  const [productCosts, packageCosts] = await Promise.all([
    getProductUnitCosts(productIds),
    getPackageUnitCosts(packageIds),
  ]);

  // Build order items with price + cost snapshot
  const orderItems = data.items.map((item) => {
    const key = item.product_id || item.package_id!;
    const info = priceMap.get(key);
    if (!info) throw new Error(`Producto no encontrado: ${key}`);
    const unitCost = item.product_id
      ? productCosts.get(item.product_id) ?? 0
      : packageCosts.get(item.package_id!) ?? 0;
    const costSubtotal = Math.round(unitCost * item.quantity * 100) / 100;
    return {
      product_id: item.product_id || null,
      package_id: item.package_id || null,
      item_name: info.name,
      unit_price: info.price,
      quantity: item.quantity,
      subtotal: info.price * item.quantity,
      unit_cost: unitCost > 0 ? Math.round(unitCost * 100) / 100 : null,
      cost_subtotal: costSubtotal > 0 ? costSubtotal : null,
      notes: item.notes || null,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const productionCostTotal = orderItems.reduce(
    (sum, i) => sum + (i.cost_subtotal ?? 0),
    0
  );

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      status: 'received',
      business_name: data.name,
      contact_name: data.name,
      phone: data.phone,
      email: data.email,
      delivery_method: data.delivery_method,
      address: data.address || null,
      city: data.city || null,
      delivery_date: data.delivery_date,
      time_slot: null,
      observations: data.observations || null,
      requires_invoice: data.requires_invoice || false,
      invoice_data: data.invoice_data || null,
      subtotal,
      production_cost: productionCostTotal > 0 ? productionCostTotal : null,
    })
    .select()
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Error al crear el pedido. Intentá nuevamente.' };
  }

  // Insert items
  await supabase.from('order_items').insert(
    orderItems.map((item) => ({ ...item, order_id: order.id }))
  );

  // Insert status history
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    from_status: null,
    to_status: 'received',
    notes: 'Pedido creado',
  });

  // Emails (non-blocking). Al cliente NO se le manda nada todavía: solo recibe
  // un mail cuando Valen aprueba el pedido (ver updateOrderStatus). Acá solo se
  // notifica a Valen del nuevo pedido para que lo revise.
  sendNewOrderNotification(order as Order, orderItems as OrderItem[]).catch(
    (err) => console.error('[email] notif admin (Valen) falló:', err)
  );
  appendOrderToSheets(order as Order, orderItems as OrderItem[]).catch(
    (err) => console.error('[sheets] append falló:', err)
  );

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');

  return { success: true, order: order as Order };
}

export async function listOrders(filters: OrderFilters = {}): Promise<{ orders: Order[]; total: number }> {
  const supabase = await createServerClient();
  const { page = 1, per_page = 20, status, from_date, to_date, search } = filters;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (from_date) query = query.gte('delivery_date', from_date);
  if (to_date) query = query.lte('delivery_date', to_date);
  if (search) query = query.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%`);

  const from = (page - 1) * per_page;
  query = query.range(from, from + per_page - 1);

  const { data, count } = await query;
  return { orders: (data as Order[]) || [], total: count || 0 };
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!order) return null;

  const [{ data: items }, { data: history }] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
  ]);

  return {
    ...order,
    items: items || [],
    status_history: history || [],
  } as OrderDetail;
}

export async function syncOrderToSheets(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado.' };

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (!items || items.length === 0) {
    return { success: false, error: 'El pedido no tiene items.' };
  }

  try {
    await appendOrderToSheets(order as Order, items as OrderItem[]);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sheets] syncOrderToSheets falló:', msg);
    return { success: false, error: msg };
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, email, contact_name, order_number')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado.' };

  const currentStatus = order.status as OrderStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `No se puede cambiar de "${ORDER_STATUS_LABELS[currentStatus]}" a "${ORDER_STATUS_LABELS[newStatus]}".`,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Error al actualizar el estado.' };

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: currentStatus,
    to_status: newStatus,
    changed_by: user?.id || null,
    notes: notes || null,
  });

  // El cliente solo recibe mail en las decisiones (aprobado / rechazado).
  // En producción, listo, enviado, etc. NO se le manda nada para no saturarlo.
  if (newStatus === 'approved' || newStatus === 'rejected') {
    sendOrderStatusUpdate(order.email, {
      contactName: order.contact_name,
      orderNumber: order.order_number,
      newStatus,
      notes: notes || undefined,
    }).catch(console.error);
  }

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/admin');

  return { success: true };
}

const EDITABLE_STATUSES: OrderStatus[] = ['received', 'pending_review'];

export async function updateOrderItems(
  orderId: string,
  items: { product_id?: string | null; package_id?: string | null; quantity: number }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (!order) return { success: false, error: 'Pedido no encontrado.' };

  if (!EDITABLE_STATUSES.includes(order.status as OrderStatus)) {
    return {
      success: false,
      error: 'Solo se pueden editar los productos antes de aprobar el pedido.',
    };
  }

  const cleanItems = items.filter((i) => (i.product_id || i.package_id) && i.quantity > 0);
  if (cleanItems.length === 0) {
    return { success: false, error: 'El pedido debe tener al menos un producto.' };
  }

  const productIds = cleanItems.filter((i) => i.product_id).map((i) => i.product_id!);
  const packageIds = cleanItems.filter((i) => i.package_id).map((i) => i.package_id!);

  const [{ data: products }, { data: packages }] = await Promise.all([
    productIds.length
      ? supabase
          .from('products')
          .select('id, name, price, min_quantity, sale_multiple, sale_unit')
          .in('id', productIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    packageIds.length
      ? supabase.from('packages').select('id, name, price').in('id', packageIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const productById = new Map((products || []).map((p) => [p.id as string, p]));
  const packageById = new Map((packages || []).map((p) => [p.id as string, p]));

  // Validar cantidades (mínimo + múltiplo) de productos
  for (const item of cleanItems) {
    if (!item.product_id) continue;
    const prod = productById.get(item.product_id) as
      | { name: string; min_quantity: number; sale_multiple: number; sale_unit: string }
      | undefined;
    if (!prod) return { success: false, error: 'Producto no encontrado.' };
    const err = quantityError(item.quantity, prod.min_quantity, prod.sale_multiple, prod.sale_unit);
    if (err) return { success: false, error: `${prod.name}: ${err}` };
  }

  const [productCosts, packageCosts] = await Promise.all([
    getProductUnitCosts(productIds),
    getPackageUnitCosts(packageIds),
  ]);

  const newItems = cleanItems.map((item) => {
    const info = item.product_id
      ? (productById.get(item.product_id) as { name: string; price: number } | undefined)
      : (packageById.get(item.package_id!) as { name: string; price: number } | undefined);
    if (!info) throw new Error('Item no encontrado');
    const unitCost = item.product_id
      ? productCosts.get(item.product_id) ?? 0
      : packageCosts.get(item.package_id!) ?? 0;
    const costSubtotal = Math.round(unitCost * item.quantity * 100) / 100;
    return {
      order_id: orderId,
      product_id: item.product_id || null,
      package_id: item.package_id || null,
      item_name: info.name,
      unit_price: info.price,
      quantity: item.quantity,
      subtotal: info.price * item.quantity,
      unit_cost: unitCost > 0 ? Math.round(unitCost * 100) / 100 : null,
      cost_subtotal: costSubtotal > 0 ? costSubtotal : null,
      notes: null,
    };
  });

  const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
  const productionCost = newItems.reduce((sum, i) => sum + (i.cost_subtotal ?? 0), 0);

  // Reemplazar items
  await supabase.from('order_items').delete().eq('order_id', orderId);
  const { error: insertError } = await supabase.from('order_items').insert(newItems);
  if (insertError) return { success: false, error: 'Error al guardar los productos.' };

  await supabase
    .from('orders')
    .update({
      subtotal,
      production_cost: productionCost > 0 ? productionCost : null,
    })
    .eq('id', orderId);

  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: order.status as OrderStatus,
    to_status: order.status as OrderStatus,
    changed_by: user?.id || null,
    notes: 'Productos del pedido editados',
  });

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function updateCostoEnvio(
  orderId: string,
  costoEnvio: number | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('orders')
    .update({ costo_envio: costoEnvio })
    .eq('id', orderId);
  if (error) return { success: false, error: 'Error al guardar el costo de envío.' };
  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { success: true };
}
