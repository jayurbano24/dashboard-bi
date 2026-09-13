import { totalesCaja } from '../cajas/caja-utils';
import { CENTROS_AUTORIZADOS, ESTADOS_CAJA } from '../shared/constants';
import type { BsdEquipo, CajaEntidad } from '../../types';

export type MetricaBodega = {
  bodega: string;
  totalCajas: number;
  abiertas: number;
  cerradas: number;
  despachadas: number;
  /** Unidades declaradas en cajas (sub-grupos) */
  esperadasEnCajas: number;
  /** Series ya pistoleadas en cajas de esta bodega */
  capturadasEnCajas: number;
  /** Pendiente dentro de las cajas abiertas/en curso */
  faltanEnCajas: number;
  /** Total series cargadas desde inventario SAP (BSD) */
  equiposEnSap: number;
  /** Series capturadas en cajas de este centro */
  equiposEmpacados: number;
  /** Series SAP aún no asignadas a ninguna caja */
  equiposPendientesEmpaque: number;
  rendimientoCajas: number;
  rendimientoEmpaque: number;
};

export type MaterialBodegaDetalle = {
  materialCodigo: string;
  materialTexto: string;
  totalSap: number;
  empacados: number;
  pendientes: number;
};

export type SeriePendienteBodega = {
  normalizedSerial: string;
  materialCodigo: string;
  materialTexto: string;
  centro: string;
  almacen: string;
  lote: string;
  statusSistema: string;
};

function serialsEmpacadosGlobal(cajas: CajaEntidad[]): Set<string> {
  const set = new Set<string>();
  for (const caja of cajas) {
    for (const cap of caja.capturas) {
      set.add(cap.normalizedSerial);
    }
  }
  return set;
}

function capturasPorCentro(cajas: CajaEntidad[], centro: string) {
  return cajas
    .filter((c) => c.centro === centro)
    .flatMap((c) => c.capturas);
}

export function calcularMetricasPorBodega(
  cajas: CajaEntidad[],
  bsdEquipos: BsdEquipo[],
): MetricaBodega[] {
  return CENTROS_AUTORIZADOS.map((bodega) => {
    const cajasBodega = cajas.filter((c) => c.centro === bodega);
    const esperadasEnCajas = cajasBodega.reduce((acc, c) => acc + totalesCaja(c).cantidadEsperada, 0);
    const capturadasEnCajas = cajasBodega.reduce((acc, c) => acc + totalesCaja(c).cantidadCapturada, 0);
    const equiposEnSap = bsdEquipos.filter((e) => e.centro === bodega).length;
    const equiposEmpacados = capturasPorCentro(cajas, bodega).length;
    const equiposPendientesEmpaque = Math.max(0, equiposEnSap - equiposEmpacados);

    return {
      bodega,
      totalCajas: cajasBodega.length,
      abiertas: cajasBodega.filter((c) => c.estado === ESTADOS_CAJA.ABIERTA).length,
      cerradas: cajasBodega.filter((c) => c.estado === ESTADOS_CAJA.CERRADA).length,
      despachadas: cajasBodega.filter((c) => c.estado === ESTADOS_CAJA.DESPACHADA).length,
      esperadasEnCajas,
      capturadasEnCajas,
      faltanEnCajas: Math.max(0, esperadasEnCajas - capturadasEnCajas),
      equiposEnSap,
      equiposEmpacados,
      equiposPendientesEmpaque,
      rendimientoCajas:
        esperadasEnCajas > 0 ? Math.round((capturadasEnCajas / esperadasEnCajas) * 100) : 0,
      rendimientoEmpaque:
        equiposEnSap > 0 ? Math.round((equiposEmpacados / equiposEnSap) * 100) : 0,
    };
  });
}

export function detalleMaterialesPorBodega(
  bodega: string,
  cajas: CajaEntidad[],
  bsdEquipos: BsdEquipo[],
): MaterialBodegaDetalle[] {
  const map = new Map<string, MaterialBodegaDetalle>();

  for (const eq of bsdEquipos) {
    if (eq.centro !== bodega) continue;
    const prev = map.get(eq.materialCodigo);
    if (prev) {
      prev.totalSap += 1;
      prev.pendientes += 1;
    } else {
      map.set(eq.materialCodigo, {
        materialCodigo: eq.materialCodigo,
        materialTexto: eq.materialTexto,
        totalSap: 1,
        empacados: 0,
        pendientes: 1,
      });
    }
  }

  for (const cap of capturasPorCentro(cajas, bodega)) {
    const prev = map.get(cap.materialCodigo);
    if (prev) {
      prev.empacados += 1;
      prev.pendientes = Math.max(0, prev.totalSap - prev.empacados);
    } else {
      map.set(cap.materialCodigo, {
        materialCodigo: cap.materialCodigo,
        materialTexto: cap.materialTexto ?? cap.materialCodigo,
        totalSap: 0,
        empacados: 1,
        pendientes: 0,
      });
    }
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      pendientes: Math.max(0, row.totalSap - row.empacados),
    }))
    .sort((a, b) => b.pendientes - a.pendientes || b.totalSap - a.totalSap);
}

/** Series en inventario SAP del centro que aún no están en ninguna caja PX. */
export function seriesPendientesEmpaquePorBodega(
  bodega: string,
  cajas: CajaEntidad[],
  bsdEquipos: BsdEquipo[],
): SeriePendienteBodega[] {
  const empacados = serialsEmpacadosGlobal(cajas);

  return bsdEquipos
    .filter((eq) => eq.centro === bodega && !empacados.has(eq.normalizedSerial))
    .map((eq) => ({
      normalizedSerial: eq.normalizedSerial,
      materialCodigo: eq.materialCodigo,
      materialTexto: eq.materialTexto,
      centro: eq.centro,
      almacen: eq.almacen,
      lote: eq.lote,
      statusSistema: eq.statusSistema,
    }))
    .sort(
      (a, b) =>
        a.materialCodigo.localeCompare(b.materialCodigo) ||
        a.normalizedSerial.localeCompare(b.normalizedSerial),
    );
}
