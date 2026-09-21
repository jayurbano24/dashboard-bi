import type { User } from '@supabase/supabase-js';
import type { getSupabaseAdmin } from '@/lib/supabase-admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export function formatUserDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
  return name || null;
}

export function displayNameFromMetadata(meta: Record<string, unknown>): string | null {
  const firstName =
    (typeof meta.first_name === 'string' && meta.first_name.trim()) ||
    (typeof meta.given_name === 'string' && meta.given_name.trim()) ||
    (typeof meta.name === 'string' ? meta.name.trim().split(' ')[0] : '');
  const lastName =
    (typeof meta.last_name === 'string' && meta.last_name.trim()) ||
    (typeof meta.family_name === 'string' && meta.family_name.trim()) ||
    (typeof meta.name === 'string' ? meta.name.trim().split(' ').slice(1).join(' ').trim() : '');

  return formatUserDisplayName(firstName, lastName);
}

export async function resolveCreatorDisplayName(
  admin: AdminClient,
  user: User,
): Promise<string> {
  const { data: profile } = await admin
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const fromProfile = formatUserDisplayName(profile?.first_name, profile?.last_name);
  if (fromProfile) return fromProfile;

  const fromMeta = displayNameFromMetadata((user.user_metadata ?? {}) as Record<string, unknown>);
  if (fromMeta) return fromMeta;

  return user.email ?? user.id;
}

function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}

/** Resuelve emails/ids guardados en created_by hacia nombre legible. */
export async function resolveCreatorLabelMap(
  admin: AdminClient,
  rawValues: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(rawValues.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];
  if (unique.length === 0) return map;

  const emails = unique.filter(looksLikeEmail);
  const userIds = unique.filter((v) => !looksLikeEmail(v));

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds);

    for (const row of profiles ?? []) {
      const name = formatUserDisplayName(row.first_name, row.last_name);
      if (name) map.set(row.user_id, name);
    }
  }

  if (emails.length > 0) {
    const emailSet = new Set(emails.map((e) => e.toLowerCase()));
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matchedUsers = (authData?.users ?? []).filter(
      (u) => u.email && emailSet.has(u.email.toLowerCase()),
    );

    if (matchedUsers.length > 0) {
      const matchedIds = matchedUsers.map((u) => u.id);
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', matchedIds);

      const profileByUserId = new Map(
        (profiles ?? []).map((row) => [row.user_id, row] as const),
      );

      for (const authUser of matchedUsers) {
        const emailKey = authUser.email!;
        const profile = profileByUserId.get(authUser.id);
        const name =
          formatUserDisplayName(profile?.first_name, profile?.last_name) ??
          displayNameFromMetadata((authUser.user_metadata ?? {}) as Record<string, unknown>) ??
          emailKey;
        map.set(emailKey, name);
        map.set(emailKey.toLowerCase(), name);
      }
    }
  }

  for (const raw of unique) {
    if (!map.has(raw) && !looksLikeEmail(raw)) {
      map.set(raw, raw);
    }
  }

  return map;
}

export function applyCreatorLabelMap<T extends { createdBy?: string | null }>(
  rows: T[],
  labelMap: Map<string, string>,
): T[] {
  return rows.map((row) => {
    const raw = row.createdBy?.trim();
    if (!raw) return row;
    const label = labelMap.get(raw) ?? labelMap.get(raw.toLowerCase());
    return label ? { ...row, createdBy: label } : row;
  });
}
