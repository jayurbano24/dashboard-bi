import type { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { SubgrupoRow } from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import { fetchAllPages } from '@/app/api/separacion-sap/_lib/supabase-fetch-all';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export async function fetchAllSubgruposForCajaIds(
  admin: AdminClient,
  cajaIds: string[],
): Promise<SubgrupoRow[]> {
  if (cajaIds.length === 0) return [];

  return fetchAllPages<SubgrupoRow>((from, to) =>
    admin
      .from('separacion_sap_caja_subgrupos')
      .select('*')
      .in('caja_id', cajaIds)
      .order('orden')
      .range(from, to)
      .then(({ data, error }) => ({ data: data as SubgrupoRow[] | null, error })),
  );
}

export async function fetchAllSubgruposForCajaId(
  admin: AdminClient,
  cajaId: string,
): Promise<SubgrupoRow[]> {
  return fetchAllPages<SubgrupoRow>((from, to) =>
    admin
      .from('separacion_sap_caja_subgrupos')
      .select('*')
      .eq('caja_id', cajaId)
      .order('orden')
      .range(from, to)
      .then(({ data, error }) => ({ data: data as SubgrupoRow[] | null, error })),
  );
}
