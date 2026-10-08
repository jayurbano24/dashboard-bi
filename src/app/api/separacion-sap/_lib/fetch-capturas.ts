import type { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { CapturaRow } from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import type { DuplicadoSerieInfo } from '@/modules/separacion-sap/types';
import { fetchAllPages } from '@/app/api/separacion-sap/_lib/supabase-fetch-all';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export async function fetchCajaIdsPorCentro(admin: AdminClient, centro: string): Promise<string[]> {
  const centroNorm = centro.trim().toUpperCase();
  const rows = await fetchAllPages<{ id: string }>((from, to) =>
    admin
      .from('separacion_sap_cajas')
      .select('id')
      .eq('centro', centroNorm)
      .order('creada_en', { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as { id: string }[] | null, error })),
  );
  return rows.map((row) => row.id);
}

/** Todas las series normalizadas ya capturadas en cajas del centro (desde Supabase). */
export async function fetchEmpacadosSerialsPorCentro(
  admin: AdminClient,
  centro: string,
): Promise<Set<string>> {
  const cajaIds = await fetchCajaIdsPorCentro(admin, centro);
  if (cajaIds.length === 0) return new Set();

  const capturas = await fetchAllCapturasForCajaIds(admin, cajaIds);
  const set = new Set<string>();
  for (const row of capturas) {
    set.add(row.normalized_serial);
    if (row.normalized_serial_s2) set.add(row.normalized_serial_s2);
  }
  return set;
}

export async function fetchAllCapturasForCajaIds(
  admin: AdminClient,
  cajaIds: string[],
): Promise<CapturaRow[]> {
  if (cajaIds.length === 0) return [];

  return fetchAllPages<CapturaRow>((from, to) =>
    admin
      .from('separacion_sap_capturas')
      .select('*')
      .in('caja_id', cajaIds)
      .order('captured_at', { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as CapturaRow[] | null, error })),
  );
}

export async function fetchAllCapturasForCajaId(
  admin: AdminClient,
  cajaId: string,
): Promise<CapturaRow[]> {
  return fetchAllPages<CapturaRow>((from, to) =>
    admin
      .from('separacion_sap_capturas')
      .select('*')
      .eq('caja_id', cajaId)
      .order('captured_at', { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as CapturaRow[] | null, error })),
  );
}

/** Duplicado en otra caja — consulta indexada, sin cargar todas las capturas en memoria. */
export async function findDuplicadoSerieEnDb(
  admin: AdminClient,
  normalizedSerial: string,
  excludeCajaId?: string,
): Promise<DuplicadoSerieInfo | null> {
  let query = admin
    .from('separacion_sap_capturas')
    .select('caja_id, subgrupo_id, material_codigo, material_texto, normalized_serial')
    .eq('normalized_serial', normalizedSerial)
    .limit(1);

  if (excludeCajaId) {
    query = query.neq('caja_id', excludeCajaId);
  }

  const { data: cap, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!cap) return null;

  const row = cap as {
    caja_id: string;
    subgrupo_id: string | null;
    material_codigo: string;
    material_texto: string | null;
    normalized_serial: string;
  };

  const { data: cajaRow, error: cajaError } = await admin
    .from('separacion_sap_cajas')
    .select('numero_caja')
    .eq('id', row.caja_id)
    .maybeSingle();

  if (cajaError) throw new Error(cajaError.message);

  return {
    normalizedSerial: row.normalized_serial,
    cajaId: row.caja_id,
    numeroCaja: (cajaRow as { numero_caja?: string } | null)?.numero_caja ?? row.caja_id,
    subgrupoId: row.subgrupo_id,
    materialCodigo: row.material_codigo,
    materialTexto: row.material_texto ?? '',
  };
}

export async function capturaExistsInCaja(
  admin: AdminClient,
  cajaId: string,
  normalizedSerial: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('separacion_sap_capturas')
    .select('id')
    .eq('caja_id', cajaId)
    .eq('normalized_serial', normalizedSerial)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}
