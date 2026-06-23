import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { OrderDetail } from '@/types';
import { DELIVERY_METHOD_LABELS } from '@/types';
import type { DeliveryMethod } from '@/types';

Font.register({
  family: 'Helvetica',
  fonts: [],
});

const C = {
  dark: '#1c1917',
  mid: '#57534e',
  light: '#a8a29e',
  line: '#e7e5e4',
  bg: '#fafaf9',
  accent: '#c2a068',
  white: '#ffffff',
  row: '#f5f4f2',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    backgroundColor: C.white,
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 48,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  brandName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: 9,
    color: C.mid,
    marginTop: 3,
    letterSpacing: 1,
  },
  compTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    textAlign: 'right',
    letterSpacing: 1,
  },
  compNumber: {
    fontSize: 10,
    color: C.mid,
    textAlign: 'right',
    marginTop: 3,
  },
  compDate: {
    fontSize: 10,
    color: C.mid,
    textAlign: 'right',
    marginTop: 2,
  },
  // Divider
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
    marginBottom: 20,
  },
  // Info grid
  infoGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  infoBlock: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 4,
    padding: 12,
  },
  infoBlockTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.light,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 9,
    color: C.mid,
    width: 72,
  },
  infoValue: {
    fontSize: 9,
    color: C.dark,
    flex: 1,
  },
  // Products table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.dark,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tableRowAlt: {
    backgroundColor: C.row,
  },
  tableCell: {
    fontSize: 10,
    color: C.dark,
  },
  tableCellSub: {
    fontSize: 8,
    color: C.light,
    marginTop: 1,
  },
  colProduct: { flex: 1 },
  colQty: { width: 44, textAlign: 'center' },
  colPrice: { width: 68, textAlign: 'right' },
  colTotal: { width: 72, textAlign: 'right' },
  // Total row
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: C.dark,
    borderRadius: 3,
    marginTop: 4,
  },
  totalLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 1,
  },
  totalAmount: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  // Footer
  footer: {
    marginTop: 36,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerThanks: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  footerContact: {
    fontSize: 9,
    color: C.mid,
    textAlign: 'right',
  },
});

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function padNum(n: number) {
  return String(n).padStart(4, '0');
}

interface Props {
  order: OrderDetail;
}

export function ComprobantePDF({ order }: Props) {
  const emittedDate = fmtDate(new Date().toISOString().split('T')[0]);

  return (
    <Document
      title={`Comprobante COSOV #${padNum(order.order_number)}`}
      author="COSOV"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>COSOV</Text>
            <Text style={s.brandSub}>REPOSTERÍA ARTESANAL</Text>
          </View>
          <View>
            <Text style={s.compTitle}>COMPROBANTE</Text>
            <Text style={s.compNumber}>N° {padNum(order.order_number)}</Text>
            <Text style={s.compDate}>Emitido: {emittedDate}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Info grid */}
        <View style={s.infoGrid}>
          {/* Client block */}
          <View style={s.infoBlock}>
            <Text style={s.infoBlockTitle}>DATOS DEL CLIENTE</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Nombre</Text>
              <Text style={s.infoValue}>
                {order.contact_name || order.business_name}
              </Text>
            </View>
            {order.phone && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Teléfono</Text>
                <Text style={s.infoValue}>{order.phone}</Text>
              </View>
            )}
            {order.email && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{order.email}</Text>
              </View>
            )}
          </View>

          {/* Delivery block */}
          <View style={s.infoBlock}>
            <Text style={s.infoBlockTitle}>ENTREGA</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Método</Text>
              <Text style={s.infoValue}>
                {DELIVERY_METHOD_LABELS[order.delivery_method as DeliveryMethod] ?? order.delivery_method}
              </Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fecha</Text>
              <Text style={s.infoValue}>{fmtDate(order.delivery_date)}</Text>
            </View>
            {order.time_slot && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Franja</Text>
                <Text style={s.infoValue}>{order.time_slot}</Text>
              </View>
            )}
            {order.address && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Dirección</Text>
                <Text style={s.infoValue}>
                  {order.address}
                  {order.city ? `, ${order.city}` : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Products table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colProduct]}>PRODUCTO</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>CANT.</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>PRECIO UNIT.</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>TOTAL</Text>
        </View>

        {order.items.map((item, i) => (
          <View
            key={item.id}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
          >
            <View style={s.colProduct}>
              <Text style={s.tableCell}>{item.item_name}</Text>
            </View>
            <Text style={[s.tableCell, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tableCell, s.colPrice]}>{fmt(item.unit_price)}</Text>
            <Text style={[s.tableCell, s.colTotal]}>{fmt(item.subtotal)}</Text>
          </View>
        ))}

        {/* Shipping cost row */}
        {order.costo_envio != null && order.costo_envio > 0 && (
          <View style={[s.tableRow, { borderBottomColor: C.accent }]}>
            <View style={s.colProduct}>
              <Text style={[s.tableCell, { color: C.mid }]}>Costo de envío</Text>
            </View>
            <Text style={[s.tableCell, s.colQty]}>—</Text>
            <Text style={[s.tableCell, s.colPrice, { color: C.mid }]}>—</Text>
            <Text style={[s.tableCell, s.colTotal]}>{fmt(order.costo_envio)}</Text>
          </View>
        )}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalAmount}>
            {fmt(order.subtotal + (order.costo_envio ?? 0))}
          </Text>
        </View>

        {/* Observations */}
        {order.observations && (
          <View style={{ marginTop: 20, padding: 12, backgroundColor: C.bg, borderRadius: 4 }}>
            <Text style={[s.infoBlockTitle, { marginBottom: 6 }]}>OBSERVACIONES</Text>
            <Text style={{ fontSize: 9, color: C.mid }}>{order.observations}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerThanks}>¡Gracias por tu pedido!</Text>
          <Text style={s.footerContact}>
            cosov.bsas@gmail.com{'\n'}Instagram: @cosov.bsas
          </Text>
        </View>
      </Page>
    </Document>
  );
}
