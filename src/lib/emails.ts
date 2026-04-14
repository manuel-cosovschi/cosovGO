import { Resend } from 'resend';
import type { Order, OrderItem, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS } from '@/types';
import { formatPrice, formatDate } from './utils';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'pedidos@cosov.com.ar';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'valencosovschi@Hotmail.com';

export async function sendOrderConfirmation(
  toEmail: string,
  order: Order,
  items: OrderItem[]
) {
  const itemsList = items
    .map((i) => `• ${i.item_name} x${i.quantity} — ${formatPrice(i.subtotal)}`)
    .join('\n');

  if (!resend) return;
  await resend.emails.send({
    from: `COSOV. Pedidos <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Pedido #${order.order_number} recibido — COSOV.`,
    text: `¡Hola ${order.contact_name}!

Tu pedido #${order.order_number} fue recibido correctamente.

Detalle:
${itemsList}

Total estimado: ${formatPrice(order.subtotal)}
Fecha de entrega: ${formatDate(order.delivery_date)}
Método: ${order.delivery_method === 'pickup' ? 'Retiro en local' : 'Envío a domicilio'}

Te confirmaremos la disponibilidad a la brevedad.

¡Gracias por elegir COSOV.!`,
  });
}

export async function sendNewOrderNotification(
  order: Order,
  items: OrderItem[]
) {
  const itemsList = items
    .map((i) => `• ${i.item_name} x${i.quantity}`)
    .join('\n');

  if (!resend) return;
  await resend.emails.send({
    from: `COSOV. Sistema <${FROM_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `Nuevo pedido #${order.order_number} — ${order.contact_name || order.business_name}`,
    text: `Nuevo pedido recibido:

Cliente: ${order.contact_name || order.business_name}
Teléfono: ${order.phone}
Email: ${order.email}

Fecha de entrega: ${formatDate(order.delivery_date)}
Método: ${order.delivery_method === 'pickup' ? 'Retiro' : 'Envío'}
${order.address ? `Dirección: ${order.address}, ${order.city}` : ''}

Productos:
${itemsList}

Total: ${formatPrice(order.subtotal)}

${order.observations ? `Observaciones: ${order.observations}` : ''}

Revisá el pedido en el dashboard.`,
  });
}

export async function sendOrderStatusUpdate(
  toEmail: string,
  data: {
    contactName: string;
    orderNumber: number;
    newStatus: OrderStatus;
    notes?: string;
  }
) {
  const statusLabel = ORDER_STATUS_LABELS[data.newStatus];

  if (!resend) return;
  await resend.emails.send({
    from: `COSOV. Pedidos <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Tu pedido #${data.orderNumber} — ${statusLabel}`,
    text: `¡Hola ${data.contactName}!

Tu pedido #${data.orderNumber} cambió de estado a: ${statusLabel}

${data.notes ? `Nota: ${data.notes}` : ''}

¡Gracias por elegir COSOV.!`,
  });
}
