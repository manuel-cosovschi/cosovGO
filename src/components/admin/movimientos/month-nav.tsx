'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function addMonth(year: number, month: number, delta: number) {
  let m = month - 1 + delta;
  let y = year + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return { year: y, month: m + 1 };
}

export function MonthNav({ year, month }: { year: number; month: number }) {
  const prev = addMonth(year, month, -1);
  const next = addMonth(year, month, 1);

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/admin/movimientos?mes=${prev.year}-${String(prev.month).padStart(2, '0')}`}
        className="rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[160px] text-center font-semibold text-stone-900">
        {MESES[month - 1]} {year}
      </span>
      <Link
        href={`/admin/movimientos?mes=${next.year}-${String(next.month).padStart(2, '0')}`}
        className="rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
