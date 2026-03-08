'use server';

import { createServerClient } from '@/lib/supabase/server';
import type { DashboardStats, Order } from '@/types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createServerClient();
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [todayRes, weekRes, pendingRes, productionRes, readyRes, recentRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['received', 'pending_review']),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'in_production'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  return {
    orders_today: todayRes.count || 0,
    orders_this_week: weekRes.count || 0,
    pending_review: pendingRes.count || 0,
    in_production: productionRes.count || 0,
    ready_for_delivery: readyRes.count || 0,
    recent_orders: (recentRes.data as Order[]) || [],
  };
}
