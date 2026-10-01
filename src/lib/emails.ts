import type { Order, OrderItem, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS } from '@/types';
import { formatPrice, formatDate } from './utils';

// === Envío de mails ===
//
// Se manda por Resend. Antes iba por Brevo, que venía dando problemas; no
// quedó como respaldo a propósito: dejar enchufado lo que no funciona sólo
// sirve para que un día los mails salgan por ahí sin que nadie se entere.
//
// Variables esperadas en Vercel:
//   RESEND_API_KEY  — se saca en https://resend.com > API Keys
//   MAIL_FROM       — remitente, con un dominio verificado en Resend
//                     (Domains > Add Domain). Formato:
//                     "COSOV. <pedidos@tudominio.com>"
//   ADMIN_EMAIL     — a dónde llegan los avisos de pedido nuevo, y a dónde
//                     contesta el cliente si responde un mail (Reply-To)
//
// BREVO_API_KEY, FROM_EMAIL y FROM_NAME ya no se usan: se pueden borrar del
// hosting.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'valencosovschi@hotmail.com';

interface MailParams {
  to: string;
  subject: string;
  text: string;
  /** Para distinguir los avisos internos de los que ve el cliente. */
  senderName?: string;
  /** A dónde va la respuesta si el destinatario contesta. */
  replyTo?: string;
}

/**
 * Manda un mail por Resend.
 *
 * Sin configurar, avisa en el log y sigue. No lanza: estas funciones se
 * llaman después de que el pedido ya está guardado, y un mail que no sale no
 * puede hacer que falle el pedido que lo disparó.
 */
async function sendEmail(params: MailParams) {
  if (!RESEND_API_KEY || !MAIL_FROM) {
    console.warn(
      '[email] Resend no configurado (falta RESEND_API_KEY o MAIL_FROM). Envío salteado.'
    );
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: params.senderName ? withName(MAIL_FROM, params.senderName) : MAIL_FROM,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>');
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

/** Cambia el nombre del remitente conservando la dirección de MAIL_FROM. */
function withName(from: string, name: string): string {
  const match = from.match(/<([^>]+)>/);
  return `${name} <${match ? match[1] : from}>`;
}

export async function sendOrderConfirmation(
  toEmail: string,
  order: Order,
  items: OrderItem[]
) {
  const itemsList = items
    .map((i) => `• ${i.item_name} x${i.quantity} — ${formatPrice(i.subtotal)}`)
    .join('\n');

  await sendEmail({
    to: toEmail,
    replyTo: ADMIN_EMAIL,
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

  await sendEmail({
    senderName: 'COSOV. Sistema',
    to: ADMIN_EMAIL,
    // Contestar este aviso le escribe al cliente, no al sistema.
    replyTo: order.email || undefined,
    subject: `Nuevo pedido #${order.order_number} — ${order.contact_name || order.business_name}`,
    text: `Nuevo pedido recibido:

Cliente: ${order.contact_name || order.business_name}
Teléfono: ${order.phone}
Email: ${order.email || '(no dejó)'}

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
    in_production: {
      subject: `Tu pedido #${data.orderNumber} está en producción`,
      intro: 'Ya estamos preparando todo para vos.',
    },
    ready: {
      subject: `Tu pedido #${data.orderNumber} está listo`,
      intro:
        'Tu pedido ya está listo para la entrega o el retiro acordado.',
    },
    delivered: {
      subject: `Tu pedido #${data.orderNumber} fue entregado`,
      intro: '¡Esperamos que lo disfrutes! Gracias por elegirnos.',
    },
    // "Cancelado" cubre también los pedidos que antes se marcaban como
    // rechazados, así que el texto sirve para los dos casos.
    cancelled: {
      subject: `Tu pedido #${data.orderNumber} fue cancelado`,
      intro:
        'Tu pedido quedó cancelado y no lo vamos a preparar. Si creés que es un error o querés hacerlo de nuevo, respondenos este mail y lo vemos.',
    },
  };

  const tpl = bodyByStatus[data.newStatus] ?? {
    subject: `Tu pedido #${data.orderNumber} — ${statusLabel}`,
    intro: `Tu pedido #${data.orderNumber} cambió de estado a: ${statusLabel}`,
  };

  await sendEmail({
    to: toEmail,
    replyTo: ADMIN_EMAIL,
    subject: tpl.subject,
    text: `¡Hola ${data.contactName}!

${tpl.intro}

${data.notes ? `Nota de COSOV.: ${data.notes}` : ''}

¡Gracias por elegir COSOV.!`,
  });
}
