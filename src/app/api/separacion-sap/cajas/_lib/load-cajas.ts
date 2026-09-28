import type { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  assembleCaja,
  type CapturaRow,
  type CajaRow,
  type SubgrupoRow,
} from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import type { CajaEntidad, EsquemaSeries, TipoProductoId } from '@/modules/separacion-sap/types';
import { applyCreatorLabelMap, resolveCreatorLabelMap } from '@/lib/user-display-name';
import { fetchAllCapturasForCajaIds } from '@/app/api/separacion-sap/_lib/fetch-capturas';
import { fetchAllSubgruposForCajaIds } from '@/app/api/separacion-sap/_lib/fetch-subgrupos';
import { fetchAllPages } from '@/app/api/separacion-sap/_lib/supabase-fetch-all';

type CajaRowDb = CajaRow & {
  marca: string;
  modelo: string;
  tipo_producto: TipoProductoId;
  material_codigo: string;
  material_texto: string;
  cantidad_esperada: number;
  cantidad_capturada: number;
  longitud_digitos: number;
  esquema_series: EsquemaSeries;
};

export type LoadCajasOptions = {
  /**
   * false (default): listado — no trae filas de capturas; progreso desde sub-grupos.
   * true: incluye todas las capturas (paginadas) — p. ej. export o migraciones.
   */
  includeCapturas?: boolean;
};

function legacySubgrupoFromCaja(row: CajaRowDb): SubgrupoRow {
  return {
    id: `legacy-${row.id}`,
    caja_id: row.id,
    marca: row.marca,
    modelo: row.modelo,
    tipo_producto: row.tipo_producto,
    material_codigo: row.material_codigo,
    material_texto: row.material_texto,
    cantidad_esperada: row.cantidad_esperada,
    cantidad_capturada: row.cantidad_capturada,
    longitud_digitos: row.longitud_digitos,
    esquema_series: row.esquema_series,
    orden: 0,
  };
}

async function fetchAllCajasRows(admin: ReturnType<typeof getSupabaseAdmin>): Promise<CajaRowDb[]> {
  return fetchAllPages<CajaRowDb>((from, to) =>
    admin
      .from('separacion_sap_cajas')
      .select('*')
      .order('creada_en', { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as CajaRowDb[] | null, error })),
  );
}

export async function loadCajasCompletasFromDb(
  admin: ReturnType<typeof getSupabaseAdmin>,
  options: LoadCajasOptions = {},
): Promise<{
  cajas: CajaEntidad[];
  secuenciaCaja: number;
}> {
  const includeCapturas = options.includeCapturas ?? false;

  const cajas = await fetchAllCajasRows(admin);
  if (cajas.length === 0) {
    return { cajas: [], secuenciaCaja: 1 };
  }

  const cajaIds = cajas.map((c) => c.id);

  let subgruposRows: SubgrupoRow[] = [];
  try {
    subgruposRows = await fetchAllSubgruposForCajaIds(admin, cajaIds);
  } catch (subError) {
    const message = subError instanceof Error ? subError.message : String(subError);
    if (!message.includes('does not exist')) {
      throw subError;
    }
  }

  let capturasRows: CapturaRow[] = [];
  if (includeCapturas) {
    capturasRows = await fetchAllCapturasForCajaIds(admin, cajaIds);
  }

  const subgruposByCaja = new Map<string, SubgrupoRow[]>();
  for (const row of subgruposRows) {
    const list = subgruposByCaja.get(row.caja_id) ?? [];
    list.push(row);
    subgruposByCaja.set(row.caja_id, list);
  }

  const capturasByCaja = new Map<string, CapturaRow[]>();
  for (const row of capturasRows) {
    const list = capturasByCaja.get(row.caja_id) ?? [];
    list.push(row);
    capturasByCaja.set(row.caja_id, list);
  }

  const assembled = cajas.map((cajaRow) => {
    let subgrupos = subgruposByCaja.get(cajaRow.id) ?? [];
    const esCajaVaciaGuiada =
      cajaRow.material_codigo === 'PENDIENTE' || cajaRow.cantidad_esperada === 0;
    if (subgrupos.length === 0 && cajaRow.material_codigo && !esCajaVaciaGuiada) {
      subgrupos = [legacySubgrupoFromCaja(cajaRow)];
    }
    return assembleCaja(cajaRow, subgrupos, capturasByCaja.get(cajaRow.id) ?? []);
  });

  const creatorLabelMap = await resolveCreatorLabelMap(
    admin,
    assembled.map((c) => c.createdBy),
  );
  const cajasConCreador = applyCreatorLabelMap(assembled, creatorLabelMap);

  let maxSeq = 0;
  for (const c of cajasConCreador) {
    const match = c.numeroCaja.match(/CAJA-(\d+)/);
    if (match) maxSeq = Math.max(maxSeq, Number.parseInt(match[1], 10));
  }

  return { cajas: cajasConCreador, secuenciaCaja: maxSeq + 1 };
}
