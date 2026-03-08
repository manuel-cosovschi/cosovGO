'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/components/cart/cart-provider';
import { orderSchema, type OrderFormValues } from '@/lib/validations/order';
import { getMinDeliveryDate } from '@/lib/advance-time';
import { DEFAULT_MIN_ADVANCE_HOURS, TIME_SLOTS } from '@/lib/constants';
import { createOrder } from '@/actions/orders';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function OrderForm() {
  const router = useRouter();
  const { items, subtotal, maxAdvanceHours, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const itemAdvanceHours = items.map((i) => i.min_advance_hours);
  const minDate = getMinDeliveryDate(DEFAULT_MIN_ADVANCE_HOURS, itemAdvanceHours);
  const minDateStr = format(minDate, 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      delivery_method: 'delivery',
      requires_invoice: false,
      items: items.map((item) => ({
        product_id: item.type === 'product' ? item.id : undefined,
        package_id: item.type === 'package' ? item.id : undefined,
        quantity: item.quantity,
      })),
    },
  });

  const deliveryMethod = watch('delivery_method');

  const onSubmit = async (data: OrderFormValues) => {
    if (items.length === 0) {
      toast.error('Agregá al menos un producto al pedido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrder({
        ...data,
        items: items.map((item) => ({
          product_id: item.type === 'product' ? item.id : undefined,
          package_id: item.type === 'package' ? item.id : undefined,
          quantity: item.quantity,
        })),
      });

      if (!result.success) {
        toast.error(result.error || 'Error al enviar el pedido.');
        return;
      }

      clearCart();
      router.push(`/pedido/confirmacion?order=${result.order?.order_number}`);
    } catch {
      toast.error('Error al enviar el pedido. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = new Date(e.target.value + 'T00:00:00');
    if (isBefore(selected, startOfDay(minDate))) {
      const hours = maxAdvanceHours || DEFAULT_MIN_ADVANCE_HOURS;
      toast.error(
        `Para garantizar disponibilidad y correcta organización de producción, los pedidos deben realizarse con un mínimo de ${hours} horas de anticipación.`
      );
      e.target.value = '';
      return;
    }
    setValue('delivery_date', e.target.value);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Datos del cliente */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-stone-900 border-b border-stone-200 pb-2">
          Datos del cliente
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business_name">Local / Marca / Cliente *</Label>
            <Input
              id="business_name"
              placeholder="Nombre del local o marca"
              {...register('business_name')}
            />
            {errors.business_name && (
              <p className="text-sm text-red-600">{errors.business_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Nombre de contacto *</Label>
            <Input
              id="contact_name"
              placeholder="Tu nombre"
              {...register('contact_name')}
            />
            {errors.contact_name && (
              <p className="text-sm text-red-600">{errors.contact_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+54 11 1234-5678"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@tucafe.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Entrega */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-stone-900 border-b border-stone-200 pb-2">
          Entrega
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Método de entrega *</Label>
            <Select
              defaultValue="delivery"
              onValueChange={(v) => setValue('delivery_method', v as 'pickup' | 'delivery')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">Envío a domicilio</SelectItem>
                <SelectItem value="pickup">Retiro en local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_date">Fecha de entrega *</Label>
            <Input
              id="delivery_date"
              type="date"
              min={minDateStr}
              {...register('delivery_date')}
              onChange={handleDateChange}
            />
            {errors.delivery_date && (
              <p className="text-sm text-red-600">{errors.delivery_date.message}</p>
            )}
            <p className="text-xs text-stone-400">
              Mínimo {maxAdvanceHours || DEFAULT_MIN_ADVANCE_HOURS}h de anticipación
            </p>
          </div>

          {deliveryMethod === 'delivery' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección de entrega *</Label>
                <Input
                  id="address"
                  placeholder="Calle y número"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad / Zona</Label>
                <Input
                  id="city"
                  placeholder="Ciudad o barrio"
                  {...register('city')}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Franja horaria (opcional)</Label>
            <Select onValueChange={(v) => setValue('time_slot', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin preferencia" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Extras */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-stone-900 border-b border-stone-200 pb-2">
          Información adicional
        </h3>

        <div className="space-y-2">
          <Label htmlFor="observations">Observaciones</Label>
          <Textarea
            id="observations"
            placeholder="Indicaciones especiales, alergias, preferencias..."
            {...register('observations')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="requires_invoice"
            className="h-4 w-4 rounded border-stone-300"
            {...register('requires_invoice')}
          />
          <Label htmlFor="requires_invoice" className="font-normal">
            Necesito factura
          </Label>
        </div>
      </div>

      {/* Resumen y envío */}
      <div className="border-t border-stone-200 pt-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-semibold">Total estimado</span>
          <span className="text-2xl font-bold text-stone-900">
            {new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
              minimumFractionDigits: 0,
            }).format(subtotal)}
          </span>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
          <p className="text-sm text-amber-800">
            Los pedidos deben realizarse con un mínimo de{' '}
            <strong>{maxAdvanceHours || DEFAULT_MIN_ADVANCE_HOURS} horas</strong> de
            anticipación para garantizar disponibilidad y calidad.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando pedido...
            </>
          ) : (
            'Enviar pedido'
          )}
        </Button>
      </div>
    </form>
  );
}
