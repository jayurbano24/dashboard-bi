import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { CENTROS_AUTORIZADOS } from '@/modules/separacion-sap/domain/shared/constants';
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
  const activeImport = await fetchActiveImport(admin);
  if (!activeImport) {
    return [...CENTROS_AUTORIZADOS];
  }

  const centros = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('separacion_sap_bsd_equipos')
      .select('centro')
      .eq('import_batch_id', activeImport.id)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = data ?? [];
    for (const row of page) {
      const centro = (row as { centro: string }).centro?.trim();
      if (centro) centros.add(centro.toUpperCase());
    }

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const ordenados: string[] = CENTROS_AUTORIZADOS.filter((c) => centros.has(c));
  for (const c of centros) {
    if (!ordenados.includes(c)) {
      ordenados.push(c);
    }
  }

  return ordenados.length > 0 ? [...ordenados] : [...CENTROS_AUTORIZADOS];
}
