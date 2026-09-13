import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  assembleCaja,
  type CapturaRow,
  type CajaRow,
  type SubgrupoRow,
} from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import type { EsquemaSeries, TipoProductoId } from '@/modules/separacion-sap/types';

export type CajaRowDb = CajaRow & {
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

export async function loadCajaById(cajaId: string) {
  const admin = getSupabaseAdmin();

  const { data: cajaRow, error: cajaError } = await admin
    .from('separacion_sap_cajas')
    .select('*')
    .eq('id', cajaId)
    .single();

  if (cajaError) throw new Error(cajaError.message);

  const [{ data: subgruposRows }, { data: capturasRows }] = await Promise.all([
    admin.from('separacion_sap_caja_subgrupos').select('*').eq('caja_id', cajaId).order('orden'),
    admin.from('separacion_sap_capturas').select('*').eq('caja_id', cajaId).order('captured_at', { ascending: false }),
  ]);

  let subgrupos = (subgruposRows as SubgrupoRow[] | null) ?? [];
  const cajaDb = cajaRow as CajaRowDb;
  const esCajaVaciaGuiada =
    cajaDb.material_codigo === 'PENDIENTE' || cajaDb.cantidad_esperada === 0;
  if (subgrupos.length === 0 && cajaDb.material_codigo && !esCajaVaciaGuiada) {
    subgrupos = [legacySubgrupoFromCaja(cajaDb)];
  }

  return assembleCaja(cajaDb, subgrupos, (capturasRows as CapturaRow[] | null) ?? []);
}

/** Sincroniza encabezado + contadores en una sola escritura (evita chk captura <= esperada). */
export async function syncCajaHeaderFromSubgrupos(cajaId: string) {
  const admin = getSupabaseAdmin();

  const [{ data: subgrupos, error }, { count: capturasCount, error: capError }] = await Promise.all([
    admin.from('separacion_sap_caja_subgrupos').select('*').eq('caja_id', cajaId).order('orden'),
    admin.from('separacion_sap_capturas').select('*', { count: 'exact', head: true }).eq('caja_id', cajaId),
  ]);

  if (error) throw new Error(error.message);
  if (capError) throw new Error(capError.message);

  const rows = (subgrupos as SubgrupoRow[] | null) ?? [];
  const cantidadCapturada = capturasCount ?? 0;
  const cantidadEsperada = rows.reduce((sum, sg) => sum + sg.cantidad_esperada, 0);

  if (rows.length === 0) {
    await admin
      .from('separacion_sap_cajas')
      .update({
        marca: 'PENDIENTE',
        modelo: 'PENDIENTE',
        material_codigo: 'PENDIENTE',
        cantidad_esperada: cantidadEsperada,
        cantidad_capturada: cantidadCapturada,
      })
      .eq('id', cajaId);
    return;
  }

  const primer = rows[0];

  await admin
    .from('separacion_sap_cajas')
    .update({
      marca: rows.length > 1 ? 'MULTI' : primer.marca,
      modelo: rows.length > 1 ? `${rows.length} líneas` : primer.modelo,
      tipo_producto: primer.tipo_producto,
      subgrupo: rows.length > 1 ? 'MULTI' : primer.material_codigo,
      material_codigo: primer.material_codigo,
      material_texto: primer.material_texto,
      cantidad_esperada: cantidadEsperada,
      cantidad_capturada: cantidadCapturada,
      longitud_digitos: primer.longitud_digitos,
      esquema_series: primer.esquema_series,
    })
    .eq('id', cajaId);
}
