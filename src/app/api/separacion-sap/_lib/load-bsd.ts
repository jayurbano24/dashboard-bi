import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rowToEquipo, type BsdImportRow } from '@/modules/separacion-sap/infrastructure/inventario/inventario-mapper';
import type { BsdEquipo } from '@/modules/separacion-sap/types';

const PAGE_SIZE = 1000;

async function fetchActiveImport(admin: ReturnType<typeof getSupabaseAdmin>): Promise<BsdImportRow | null> {
  const { data, error } = await admin
    .from('separacion_sap_bsd_imports')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BsdImportRow | null;
}

export async function loadBsdEquiposActivos(): Promise<BsdEquipo[]> {
  const admin = getSupabaseAdmin();
  const activeImport = await fetchActiveImport(admin);
  if (!activeImport) return [];

  const equipos: BsdEquipo[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('separacion_sap_bsd_equipos')
      .select('material_codigo, material_texto, normalized_serial, centro, almacen, lote, status_sistema')
      .eq('import_batch_id', activeImport.id)
      .order('normalized_serial')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = data ?? [];
    equipos.push(...page.map(rowToEquipo));

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return equipos;
}

export async function loadCentrosDisponibles(): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('separacion_sap_bsd_equipos').select('centro');

  if (error) throw new Error(error.message);

  const centros = new Set<string>();
  for (const row of data ?? []) {
    const centro = (row as { centro: string }).centro?.trim();
    if (centro) centros.add(centro.toUpperCase());
  }

  const sorted = [...centros].sort();
  return sorted.length > 0 ? sorted : ['G945', 'G935', 'G944'];
}
