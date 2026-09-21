import type { CajaEntidad, CajaSubgrupo } from '../../types';

export function totalesCaja(caja: CajaEntidad): { cantidadEsperada: number; cantidadCapturada: number } {
  const cantidadEsperada = caja.subgrupos.reduce((sum, sg) => sum + sg.cantidadEsperada, 0);
  const cantidadCapturada = caja.capturas.length;
  return { cantidadEsperada, cantidadCapturada };
}

export function resumenSubgruposCaja(caja: CajaEntidad): string {
  if (caja.subgrupos.length === 0) return 'Sin sub-grupos';
  if (caja.subgrupos.length === 1) {
    const sg = caja.subgrupos[0];
    return `${sg.marca} ${sg.modelo}`;
  }
  const primero = caja.subgrupos[0];
  return `${primero.marca} ${primero.modelo} +${caja.subgrupos.length - 1}`;
}

export function resumenMaterialesCaja(caja: CajaEntidad): string {
  const codigos = [...new Set(caja.subgrupos.map((sg) => sg.materialCodigo))];
  if (codigos.length === 0) return '—';
  if (codigos.length === 1) return codigos[0];
  return `${codigos[0]} +${codigos.length - 1}`;
}

export function subgrupoPorId(caja: CajaEntidad, subgrupoId: string): CajaSubgrupo | undefined {
  return caja.subgrupos.find((sg) => sg.id === subgrupoId);
}

export function capturasPorSubgrupo(caja: Pick<CajaEntidad, 'capturas'>, subgrupoId: string): number {
  return caja.capturas.filter((cap) => cap.subgrupoId === subgrupoId).length;
}

/** Desglose compacto capturado/esperado por sub-grupo (p. ej. "0/50 · 12/30"). */
export function detalleCantidadesSubgrupos(caja: CajaEntidad): string {
  if (caja.subgrupos.length === 0) return 'Sin sub-grupos';
  return caja.subgrupos
    .map((sg) => {
      const cap = capturasPorSubgrupo(caja, sg.id);
      return `${cap}/${sg.cantidadEsperada}`;
    })
    .join(' · ');
}

export function subgrupoCompleto(caja: CajaEntidad, subgrupoId: string): boolean {
  const sg = subgrupoPorId(caja, subgrupoId);
  if (!sg) return false;
  if (sg.estado === 'LLENO') return true;
  return capturasPorSubgrupo(caja, subgrupoId) >= sg.cantidadEsperada;
}

export function subgruposLlenos(caja: CajaEntidad): CajaSubgrupo[] {
  return caja.subgrupos.filter((sg) => sg.estado === 'LLENO' || subgrupoCompleto(caja, sg.id));
}

export function tieneSubgrupoEnProgreso(caja: CajaEntidad): boolean {
  return caja.subgrupos.some(
    (sg) => sg.estado === 'EN_PROGRESO' && capturasPorSubgrupo(caja, sg.id) > 0 && !subgrupoCompleto(caja, sg.id),
  );
}

export function puedeTerminarCaja(caja: CajaEntidad): boolean {
  if (caja.estado !== 'ABIERTA') return false;
  if (subgruposLlenos(caja).length === 0) return false;
  if (tieneSubgrupoEnProgreso(caja)) return false;
  return true;
}
