import type { BsdEquipo, SeparacionSapState } from '../../types';

export function inventarioSapCargado(state: Pick<SeparacionSapState, 'bsdEquipos'>): boolean {
  return state.bsdEquipos.length > 0;
}

export function contarEquiposPorCentro(equipos: BsdEquipo[], centro: string): number {
  return equipos.filter((item) => item.centro === centro).length;
}
