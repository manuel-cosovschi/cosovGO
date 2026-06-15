import { NextRequest, NextResponse } from 'next/server';
import { rebuildAndResyncMonth } from '@/actions/sheet-tools';

// One-time admin endpoint for manual sheet repair.
// Remove this file after use.
const REPAIR_TOKEN = 'a8885d74ca62640f3beb59854b9f6b137232602797dc19db';

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-repair-token');
  if (token !== REPAIR_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const year = Number(body.year ?? 2026);
  const month = Number(body.month ?? 6);

  try {
    const result = await rebuildAndResyncMonth(year, month);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
