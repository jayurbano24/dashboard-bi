import type { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  assembleCaja,
  type CapturaRow,
  type CajaRow,
  type SubgrupoRow,
} from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import type { CajaEntidad, EsquemaSeries, TipoProductoId } from '@/modules/separacion-sap/types';

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

export async function loadCajasCompletasFromDb(admin: ReturnType<typeof getSupabaseAdmin>): Promise<{
  cajas: CajaEntidad[];
  secuenciaCaja: number;
}> {
  const { data: cajasRows, error: cajasError } = await admin
    .from('separacion_sap_cajas')
    .select('*')
    .order('creada_en', { ascending: false });

  if (cajasError) throw new Error(cajasError.message);

  const cajas = (cajasRows as CajaRowDb[] | null) ?? [];
  if (cajas.length === 0) {
    return { cajas: [], secuenciaCaja: 1 };
  }

  const cajaIds = cajas.map((c) => c.id);

  const [{ data: subgruposRows, error: subError }, { data: capturasRows, error: capError }] = await Promise.all([
    admin.from('separacion_sap_caja_subgrupos').select('*').in('caja_id', cajaIds).order('orden'),
    admin.from('separacion_sap_capturas').select('*').in('caja_id', cajaIds).order('captured_at', { ascending: false }),
  ]);

  if (subError && !subError.message.includes('does not exist')) {
    throw new Error(subError.message);
  }
  if (capError) throw new Error(capError.message);

  const subgruposByCaja = new Map<string, SubgrupoRow[]>();
  for (const row of (subgruposRows as SubgrupoRow[] | null) ?? []) {
    const list = subgruposByCaja.get(row.caja_id) ?? [];
    list.push(row);
    subgruposByCaja.set(row.caja_id, list);
  }

  const capturasByCaja = new Map<string, CapturaRow[]>();
  for (const row of (capturasRows as CapturaRow[] | null) ?? []) {
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

  let maxSeq = 0;
  for (const c of assembled) {
    const match = c.numeroCaja.match(/CAJA-(\d+)/);
    if (match) maxSeq = Math.max(maxSeq, Number.parseInt(match[1], 10));
  }

  return { cajas: assembled, secuenciaCaja: maxSeq + 1 };
}
