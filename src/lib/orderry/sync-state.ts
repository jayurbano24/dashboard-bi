import { getSupabaseAdmin } from '@/lib/supabase-store';

export async function getSyncState<T extends Record<string, unknown>>(
  key: string,
): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('sync_state')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    if (error.message.includes('does not exist')) return null;
    throw new Error(`sync_state read failed: ${error.message}`);
  }

  return (data?.value as T | undefined) ?? null;
}

export async function setSyncState(key: string, value: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('sync_state').upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) {
    throw new Error(`sync_state write failed: ${error.message}`);
  }
}
