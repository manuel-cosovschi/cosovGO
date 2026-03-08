'use client';

import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      setSettings(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateSettings({
        min_advance_hours: settings.min_advance_hours || '48',
        admin_email: JSON.stringify(settings.admin_email || ''),
        business_name: JSON.stringify(settings.business_name || 'COSOV.'),
        business_phone: JSON.stringify(settings.business_phone || ''),
      });
      if (result.success) {
        toast.success('Configuración guardada');
      } else {
        toast.error(result.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  // Parse JSON strings for display
  const parseValue = (val: string) => {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'string' ? parsed : val;
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-900">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regla de anticipación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min_advance_hours">Horas mínimas de anticipación</Label>
            <Input
              id="min_advance_hours"
              type="number"
              value={settings.min_advance_hours || '48'}
              onChange={(e) => updateField('min_advance_hours', e.target.value)}
            />
            <p className="text-xs text-stone-400">
              Valor actual: {settings.min_advance_hours || 48} horas. Los clientes no pueden
              seleccionar fechas de entrega con menos anticipación.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Nombre del negocio</Label>
            <Input
              id="business_name"
              value={parseValue(settings.business_name || '"COSOV."')}
              onChange={(e) => updateField('business_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin_email">Email de administración</Label>
            <Input
              id="admin_email"
              type="email"
              value={parseValue(settings.admin_email || '""')}
              onChange={(e) => updateField('admin_email', e.target.value)}
            />
            <p className="text-xs text-stone-400">
              A este email se envían las notificaciones de nuevos pedidos.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_phone">Teléfono</Label>
            <Input
              id="business_phone"
              value={parseValue(settings.business_phone || '""')}
              onChange={(e) => updateField('business_phone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar configuración
      </Button>
    </div>
  );
}
