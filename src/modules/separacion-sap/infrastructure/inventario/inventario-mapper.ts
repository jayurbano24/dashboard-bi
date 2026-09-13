import type { BsdEquipo } from '../../types';

export type BsdEquipoRow = {
  material_codigo: string;
  material_texto: string;
  normalized_serial: string;
  centro: string;
  almacen: string;
  lote: string;
  status_sistema: string;
  import_batch_id: string;
};

export type BsdImportRow = {
  id: string;
  filename: string | null;
  registros_totales: number;
  registros_g945: number;
  materiales_detectados: number;
  imported_by: string | null;
  activo: boolean;
  created_at: string;
};

export function equipoToRow(equipo: BsdEquipo, importBatchId: string): BsdEquipoRow {
  return {
    material_codigo: equipo.materialCodigo,
    material_texto: equipo.materialTexto,
    normalized_serial: equipo.normalizedSerial,
    centro: equipo.centro,
    almacen: equipo.almacen,
    lote: equipo.lote,
    status_sistema: equipo.statusSistema,
    import_batch_id: importBatchId,
  };
}

export function rowToEquipo(row: {
  material_codigo: string;
  material_texto: string;
  normalized_serial: string;
  centro: string;
  almacen: string;
  lote: string;
  status_sistema: string;
}): BsdEquipo {
  return {
    materialCodigo: row.material_codigo,
    materialTexto: row.material_texto,
    normalizedSerial: row.normalized_serial,
    centro: row.centro,
    almacen: row.almacen,
    lote: row.lote,
    statusSistema: row.status_sistema,
  };
}
