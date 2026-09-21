import type { BsdEquipo, SeparacionSapState } from '../../types';

export const CENTROS_INVENTARIO_SAP = ['G945', 'G935', 'G944'] as const;

export type ResumenInventarioBodega = {
  centro: (typeof CENTROS_INVENTARIO_SAP)[number];
  series: number;
  materiales: number;
};

export function inventarioSapCargado(state: Pick<SeparacionSapState, 'bsdEquipos'>): boolean {
  return state.bsdEquipos.length > 0;
}

export function contarEquiposPorCentro(equipos: BsdEquipo[], centro: string): number {
  return equipos.filter((item) => item.centro === centro).length;
}

export function resumenInventarioPorBodega(equipos: BsdEquipo[]): ResumenInventarioBodega[] {
  return CENTROS_INVENTARIO_SAP.map((centro) => {
    const items = equipos.filter((item) => String(item.centro).trim().toUpperCase() === centro);
    const materiales = new Set(
      items.map((item) => String(item.materialCodigo).trim()).filter(Boolean),
    );
    return { centro, series: items.length, materiales: materiales.size };
  });
}

export type MaterialCantidadAlmacen = {
  centro: string;
  almacen: string;
  materialCodigo: string;
  materialTexto: string;
  cantidad: number;
};

/** Cantidad de series SAP agrupadas por bodega (centro), almacén y material. */
export function materialesCantidadPorAlmacen(
  equipos: BsdEquipo[],
  centroFiltro?: string,
): MaterialCantidadAlmacen[] {
  const map = new Map<string, MaterialCantidadAlmacen>();

  for (const eq of equipos) {
    const centro = String(eq.centro).trim().toUpperCase();
    if (centroFiltro && centro !== centroFiltro) continue;

    const almacen = String(eq.almacen || 'D000').trim().toUpperCase();
    const materialCodigo = String(eq.materialCodigo).trim();
    if (!materialCodigo) continue;

    const key = `${centro}|${almacen}|${materialCodigo}`;
    const prev = map.get(key);
    if (prev) {
      prev.cantidad += 1;
    } else {
      map.set(key, {
        centro,
        almacen,
        materialCodigo,
        materialTexto: eq.materialTexto?.trim() || materialCodigo,
        cantidad: 1,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      a.centro.localeCompare(b.centro) ||
      a.almacen.localeCompare(b.almacen) ||
      a.materialCodigo.localeCompare(b.materialCodigo),
  );
}
