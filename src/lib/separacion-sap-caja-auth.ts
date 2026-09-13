import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  canDeleteClosedCaja,
  readJobTitleFromMetadata,
} from '@/modules/separacion-sap/domain/cajas/caja-delete-permissions';

export async function resolveUserJobTitle(
  userId: string,
  meta: Record<string, unknown>,
): Promise<string | null> {
  const fromMeta = readJobTitleFromMetadata(meta);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('job_title')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && typeof data?.job_title === 'string' && data.job_title.trim()) {
      return data.job_title.trim();
    }
  } catch {
    // Columna job_title puede no existir aún; usar metadata.
  }

  return fromMeta;
}

export async function userCanDeleteClosedCaja(user: User): Promise<boolean> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const jobTitle = await resolveUserJobTitle(user.id, meta);
  return canDeleteClosedCaja({ email: user.email, jobTitle });
}
