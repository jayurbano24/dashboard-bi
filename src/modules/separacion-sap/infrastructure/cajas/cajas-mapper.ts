import type {
  CapturaSerie,
  CajaEntidad,
  CajaSubgrupo,
  EsquemaSeries,
  EstadoCaja,
  EstadoSubgrupo,
  TipoProductoId,
  ValoracionSubgrupo,
} from '../../types';

export type CajaRow = {
  id: string;
  numero_caja: string;
  centro: string;
  almacen: string;
  estado: EstadoCaja;
  ubicacion: string;
  tarima: string;
  observaciones: string;
  creada_en: string;
  cerrada_en: string | null;
  despachada_en: string | null;
  created_by: string | null;
};

export type SubgrupoRow = {
  id: string;
  caja_id: string;
  marca: string;
  modelo: string;
  tipo_producto: TipoProductoId;
  material_codigo: string;
  material_texto: string;
  cantidad_esperada: number;
  cantidad_capturada: number;
  longitud_digitos: number;
  esquema_series: EsquemaSeries;
  orden: number;
  estado?: EstadoSubgrupo;
  valoracion?: ValoracionSubgrupo | null;
  cantidad_disponible_sap?: number | null;
};

export type CapturaRow = {
  id: string;
  caja_id: string;
  subgrupo_id: string | null;
  normalized_serial: string;
  normalized_serial_s2: string | null;
  esquema_series: EsquemaSeries;
  material_codigo: string;
  material_texto: string | null;
  centro: string;
  almacen: string;
  lote: string | null;
  status_bsd: string | null;
  status_captura: string;
  captured_at: string;
  captured_by: string | null;
};

export function rowToSubgrupo(row: SubgrupoRow): CajaSubgrupo {
  return {
    id: row.id,
    marca: row.marca,
    modelo: row.modelo,
    tipoProducto: row.tipo_producto,
    materialCodigo: row.material_codigo,
    materialTexto: row.material_texto,
    cantidadEsperada: row.cantidad_esperada,
    cantidadCapturada: row.cantidad_capturada,
    longitudDigitos: row.longitud_digitos,
    esquemaSeries: row.esquema_series,
    estado: row.estado ?? 'EN_PROGRESO',
    valoracion: row.valoracion ?? null,
    cantidadDisponibleSap: row.cantidad_disponible_sap ?? null,
  };
}

export function rowToCaptura(row: CapturaRow): CapturaSerie {
  return {
    id: row.id,
    cajaId: row.caja_id,
    subgrupoId: row.subgrupo_id ?? undefined,
    normalizedSerial: row.normalized_serial,
    normalizedSerialS2: row.normalized_serial_s2,
    esquemaSeries: row.esquema_series,
    materialCodigo: row.material_codigo,
    materialTexto: row.material_texto ?? undefined,
    centro: row.centro,
    almacen: row.almacen,
    lote: row.lote ?? '',
    statusBsd: row.status_bsd ?? '',
    statusCaptura: row.status_captura,
    capturedAt: row.captured_at,
    capturedBy: row.captured_by ?? undefined,
  };
}

export function assembleCaja(cajaRow: CajaRow, subgrupos: SubgrupoRow[], capturas: CapturaRow[]): CajaEntidad {
  return {
    id: cajaRow.id,
    numeroCaja: cajaRow.numero_caja,
    centro: cajaRow.centro,
    almacen: cajaRow.almacen,
    estado: cajaRow.estado,
    ubicacion: cajaRow.ubicacion,
    tarima: cajaRow.tarima,
    observaciones: cajaRow.observaciones,
    creadaEn: cajaRow.creada_en,
    cerradaEn: cajaRow.cerrada_en,
    despachadaEn: cajaRow.despachada_en,
    createdBy: cajaRow.created_by,
    subgrupos: subgrupos.sort((a, b) => a.orden - b.orden).map(rowToSubgrupo),
    capturas: capturas.map(rowToCaptura).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
  };
}
