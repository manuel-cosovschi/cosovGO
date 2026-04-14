'use server';

import { createServerClient } from '@/lib/supabase/server';
import { orderSchema } from '@/lib/validations/order';
import { sendOrderConfirmation, sendNewOrderNotification, sendOrderStatusUpdate } from '@/lib/emails';
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

  let productsData: { id: string; name: string; price: number }[] = [];
  let packagesData: { id: string; name: string; price: number }[] = [];

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price')
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

  // Build price map
  const priceMap = new Map<string, { name: string; price: number }>();
  productsData.forEach((p) => priceMap.set(p.id, { name: p.name, price: p.price }));
  packagesData.forEach((p) => priceMap.set(p.id, { name: p.name, price: p.price }));

  // Build order items with price snapshot
  const orderItems = data.items.map((item) => {
    const key = item.product_id || item.package_id!;
    const info = priceMap.get(key);
    if (!info) throw new Error(`Producto no encontrado: ${key}`);
    return {
      product_id: item.product_id || null,
      package_id: item.package_id || null,
      item_name: info.name,
      unit_price: info.price,
      quantity: item.quantity,
      subtotal: info.price * item.quantity,
      notes: item.notes || null,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

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

  // Send emails (non-blocking)
  Promise.all([
    sendOrderConfirmation(data.email, order as Order, orderItems as OrderItem[]),
    sendNewOrderNotification(order as Order, orderItems as OrderItem[]),
  ]).catch(console.error);

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

  sendOrderStatusUpdate(order.email, {
    contactName: order.contact_name,
    orderNumber: order.order_number,
    newStatus,
    notes: notes || undefined,
  }).catch(console.error);

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/admin');

  return { success: true };
}
