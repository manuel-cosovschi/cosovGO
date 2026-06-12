import type { Order, OrderItem, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS } from '@/types';
import { formatPrice, formatDate } from './utils';

// === Brevo (ex Sendinblue) ===
// Free tier: 300 mails/día. Usa "single-sender verification" (no requiere DNS
// ni dominio propio): Valen confirma un email suyo con un link, y podemos
// mandar desde ese remitente a CUALQUIER destinatario — esto desbloquea
// mandar confirmaciones a clientes externos.
//
// Env vars esperadas en Vercel:
//   BREVO_API_KEY   — la key generada en https://app.brevo.com/settings/keys/api
//   FROM_EMAIL      — email verificado como single-sender (ej: valencosovschi@hotmail.com)
//   FROM_NAME       — opcional, nombre que ven los clientes (default: "COSOV.")
//   ADMIN_EMAIL     — a dónde llegan los avisos a Valen
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || '';
const FROM_NAME = process.env.FROM_NAME || 'COSOV.';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'valencosovschi@hotmail.com';

async function sendBrevo(params: {
  to: string;
  subject: string;
  text: string;
  senderName?: string;
}) {
  if (!BREVO_API_KEY || !FROM_EMAIL) {
    console.warn(
      '[email] Brevo no configurado (falta BREVO_API_KEY o FROM_EMAIL). Envío salteado.'
    );
    return;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: params.senderName || FROM_NAME, email: FROM_EMAIL },
      to: [{ email: params.to }],
      subject: params.subject,
      textContent: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>');
    throw new Error(`Brevo ${res.status}: ${body}`);
  }
}

export async function sendOrderConfirmation(
  toEmail: string,
  order: Order,
  items: OrderItem[]
) {
  const itemsList = items
    .map((i) => `• ${i.item_name} x${i.quantity} — ${formatPrice(i.subtotal)}`)
    .join('\n');

  await sendBrevo({
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
    .map((i) => {
      const cost = i.cost_subtotal != null
        ? ` · Costo ${formatPrice(i.cost_subtotal)}`
        : '';
      return `• ${i.item_name} x${i.quantity} — Precio ${formatPrice(i.subtotal)}${cost}`;
    })
    .join('\n');

  const productionCost = order.production_cost ?? 0;
  const margin = order.subtotal - productionCost;
  const someMissingCost = items.some((i) => i.cost_subtotal == null || i.cost_subtotal === 0);

  const costSummary = order.production_cost != null
    ? `Costo de producción: ${formatPrice(productionCost)}
Margen estimado: ${formatPrice(margin)}${someMissingCost ? '\n(falta cargar costo de producción de algunos productos)' : ''}`
    : '';

  await sendBrevo({
    senderName: 'COSOV. Sistema',
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

Total facturado: ${formatPrice(order.subtotal)}
${costSummary}

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

  // Mensaje específico según el estado nuevo — más cálido que un genérico.
  const bodyByStatus: Partial<Record<OrderStatus, { subject: string; intro: string }>> = {
    approved: {
      subject: `¡Tu pedido #${data.orderNumber} fue confirmado!`,
      intro:
        'Confirmamos que vamos a hacer tu pedido. Ya empezamos la producción y te vamos a avisar cuando esté listo.',
    },
    rejected: {
      subject: `Tu pedido #${data.orderNumber} no pudo realizarse`,
      intro:
        'Lamentablemente no vamos a poder hacer tu pedido. Si tenés dudas, respondenos este mail y te contamos.',
    },
    in_production: {
      subject: `Tu pedido #${data.orderNumber} está en producción`,
      intro: 'Ya estamos preparando todo para vos.',
    },
    ready: {
      subject: `Tu pedido #${data.orderNumber} está listo`,
      intro:
        'Tu pedido ya está listo para la entrega o el retiro acordado.',
    },
    shipped: {
      subject: `Tu pedido #${data.orderNumber} salió para entrega`,
      intro: 'Salió rumbo a la dirección de entrega.',
    },
    delivered: {
      subject: `Tu pedido #${data.orderNumber} fue entregado`,
      intro: '¡Esperamos que lo disfrutes! Gracias por elegirnos.',
    },
    cancelled: {
      subject: `Tu pedido #${data.orderNumber} fue cancelado`,
      intro: 'El pedido quedó cancelado. Cualquier duda, respondenos este mail.',
    },
  };

  const tpl = bodyByStatus[data.newStatus] ?? {
    subject: `Tu pedido #${data.orderNumber} — ${statusLabel}`,
    intro: `Tu pedido #${data.orderNumber} cambió de estado a: ${statusLabel}`,
  };

  await sendBrevo({
    to: toEmail,
    subject: tpl.subject,
    text: `¡Hola ${data.contactName}!

${tpl.intro}

${data.notes ? `Nota de COSOV.: ${data.notes}` : ''}

¡Gracias por elegir COSOV.!`,
  });
}
