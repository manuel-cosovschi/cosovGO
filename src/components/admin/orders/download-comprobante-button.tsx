'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  orderId: string;
  orderNumber: number;
}

export function DownloadComprobanteButton({ orderId, orderNumber }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/comprobante`);
      if (!res.ok) throw new Error('Error generando comprobante');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-cosov-${String(orderNumber).padStart(4, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el comprobante. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Descargar comprobante
    </button>
  );
}
