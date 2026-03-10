'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  BoxesIcon,
  TagIcon,
  Settings,
  LogOut,
  Menu,
  X,
  Egg,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/paquetes', label: 'Paquetes', icon: BoxesIcon },
  { href: '/admin/categorias', label: 'Categorías', icon: TagIcon },
  { href: '/admin/ingredientes', label: 'Ingredientes', icon: Egg },
  { href: '/admin/inventario', label: 'Inventario', icon: BarChart3 },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const nav = (
    <>
      <div className="flex items-center gap-2 px-4 py-6 border-b border-stone-200">
        <span className="text-xl font-bold tracking-tight">COSOV.</span>
        <span className="text-xs text-stone-400 font-medium">Admin</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {sidebarLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(link.href)
                ? 'bg-stone-100 text-stone-900'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-stone-200 p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-md bg-white p-2 shadow-md border border-stone-200"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menú admin"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {nav}
      </aside>
    </>
  );
}
