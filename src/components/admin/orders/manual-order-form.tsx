'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createManualOrder } from '@/actions/orders';
import { formatPrice } from '@/lib/utils';
import type { ManualOrderValues } from '@/lib/validations/order';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export interface PickableProduct {
  id: string;
  name: string;
  price: number;
  sale_unit: string;
}

interface Row {
  key: string;
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  sale_unit: string;
}

interface Props {
  products: PickableProduct[];
}

/** Hoy en formato YYYY-MM-DD, en hora local (no UTC). */
function hoy(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ManualOrderForm({ products }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [canal, setCanal] = useState<'minorista' | 'mayorista'>('minorista');
  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(hoy());
  const [observations, setObservations] = useState('');
  const [status, setStatus] = useState<'received' | 'approved'>('approved');
  const [rows, setRows] = useState<Row[]>([]);
  const [addId, setAddId] = useState('');

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0),
    [rows]
  );

  const addRow = () => {
    const prod = products.find((p) => p.id === addId);
    if (!prod) return;
    setRows((prev) => [
      ...prev,
      {
        key: `${prod.id}-${Date.now()}`,
        product_id: prod.id,
        name: prod.name,
        // Arranca con el precio de lista; ella lo pisa si es minorista.
        unit_price: prod.price,
        quantity: 1,
        sale_unit: prod.sale_unit,
      },
    ]);
    setAddId('');
  };

  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactName.trim()) return toast.error('Poné el nombre del cliente');
    if (phone.trim().length < 6) return toast.error('Poné un teléfono');
    if (rows.length === 0) return toast.error('Agregá al menos un producto');
    if (deliveryMethod === 'delivery' && !address.trim()) {
      return toast.error('Poné la dirección de entrega');
    }

    const payload: ManualOrderValues = {
      canal,
      contact_name: contactName.trim(),
      business_name: businessName.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      delivery_method: deliveryMethod,
      address: address.trim() || undefined,
      delivery_date: deliveryDate,
      observations: observations.trim() || undefined,
      status,
      items: rows.map((r) => ({
        product_id: r.product_id,
        quantity: r.quantity,
        unit_price: r.unit_price,
      })),
    };

    setSaving(true);
    try {
      const result = await createManualOrder(payload);
      if (result.success) {
        toast.success(`Pedido #${result.order?.order_number} cargado`);
        router.push(`/admin/pedidos/${result.order?.id}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Error al cargar el pedido');
      }
    } catch {
      toast.error('Error al cargar el pedido');
    } finally {
      setSaving(false);
    }
  };

  const disponibles = products.filter(
    (p) => !rows.some((r) => r.product_id === p.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Cliente */}
      <section className="rounded-lg border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-stone-900">Cliente</h2>

        <div className="flex gap-2">
          {(['minorista', 'mayorista'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCanal(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                canal === c
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactName">Nombre *</Label>
            <Input
              id="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ej: María Gómez"
            />
          </div>

          {canal === 'mayorista' && (
            <div className="space-y-2">
              <Label htmlFor="businessName">Negocio</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Azul Café"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 341 555 1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Opcional"
            />
            <p className="text-xs text-stone-400">
              Si lo dejás vacío, el cliente no va a recibir mails del pedido.
            </p>
          </div>
        </div>
      </section>

      {/* Entrega */}
      <section className="rounded-lg border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-stone-900">Entrega</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Fecha *</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <p className="text-xs text-stone-400">
              Podés poner una fecha pasada si estás cargando un pedido viejo.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Cómo lo recibe</Label>
            <div className="flex gap-2">
              {([
                ['pickup', 'Retira'],
                ['delivery', 'Envío'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDeliveryMethod(value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    deliveryMethod === value
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {deliveryMethod === 'delivery' && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      {/* Productos */}
      <section className="rounded-lg border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-stone-900">Productos</h2>

        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">Todavía no agregaste nada.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.key}
                className="flex flex-wrap items-end gap-3 rounded-md border border-stone-200 bg-stone-50 p-3"
              >
                <p className="min-w-[10rem] flex-1 text-sm font-medium text-stone-900">
                  {r.name}
                </p>

                <div className="space-y-1">
                  <label className="block text-xs text-stone-500">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={r.quantity}
                    onChange={(e) =>
                      patchRow(r.key, {
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-24 rounded border border-stone-200 bg-white px-2 py-1 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-stone-500">
                    Precio por {r.sale_unit || 'unidad'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={r.unit_price}
                    onChange={(e) =>
                      patchRow(r.key, {
                        unit_price: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-32 rounded border border-stone-200 bg-white px-2 py-1 text-sm"
                  />
                </div>

                <p className="w-24 text-right text-sm font-medium text-stone-900">
                  {formatPrice(r.unit_price * r.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  className="text-red-500 hover:text-red-700"
                  aria-label={`Quitar ${r.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            className="flex-1 min-w-[12rem] rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Elegí un producto…</option>
            {disponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatPrice(p.price)}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" disabled={!addId} onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
          </Button>
        </div>

        <p className="text-xs text-stone-400">
          El precio arranca con el de lista. Si es un pedido minorista, pisalo
          con lo que le cobrás a un particular.
        </p>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="font-medium text-stone-700">Total</span>
          <span className="text-lg font-bold text-stone-900">{formatPrice(total)}</span>
        </div>
      </section>

      {/* Cierre */}
      <section className="rounded-lg border border-stone-200 bg-white p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="observations">Observaciones</Label>
          <Textarea
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Lo que te haya pedido por WhatsApp"
          />
        </div>

        <div className="space-y-2">
          <Label>Estado inicial</Label>
          <div className="flex gap-2">
            {([
              ['approved', 'Aprobado'],
              ['received', 'Recibido'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400">
            Si ya se lo confirmaste al cliente, dejalo en Aprobado.
          </p>
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cargar pedido
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
