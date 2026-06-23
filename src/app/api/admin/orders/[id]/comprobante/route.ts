import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ComprobantePDF } from '@/components/admin/orders/comprobante-pdf';
import { getOrder } from '@/actions/orders';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  // Require authenticated session
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return new NextResponse('Pedido no encontrado', { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ComprobantePDF, { order }) as any;
  const buffer = await renderToBuffer(element);
  const uint8 = new Uint8Array(buffer);

  const padded = String(order.order_number).padStart(4, '0');
  const filename = `comprobante-cosov-${padded}.pdf`;

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
