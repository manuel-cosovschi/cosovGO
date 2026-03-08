'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getSettings(): Promise<Record<string, string>> {
  const supabase = await createServerClient();
  const { data } = await supabase.from('settings').select('key, value');
  const settings: Record<string, string> = {};
  (data || []).forEach((row) => {
    settings[row.key] = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
  });
  return settings;
}

export async function updateSettings(updates: Record<string, string>): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();

  for (const [key, value] of Object.entries(updates)) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value: JSON.parse(value), updated_at: new Date().toISOString() });
    if (error) return { success: false, error: `Error al guardar ${key}.` };
  }

  revalidatePath('/admin/configuracion');
  return { success: true };
}
