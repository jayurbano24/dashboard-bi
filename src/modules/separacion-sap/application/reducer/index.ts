import { puedeTerminarCaja, subgruposLlenos } from '../../domain/cajas/caja-utils';
import type { CajaEntidad, SeparacionSapState } from '../../types';
import { reduceAuditoria, type AuditoriaAction } from './auditoria';
import { reduceCajas, type CajasAction } from './cajas';
import { reduceInventario, type InventarioAction } from './inventario';
import { reduceUi, type UiAction } from './ui';

export type SeparacionSapAction = InventarioAction | CajasAction | AuditoriaAction | UiAction;

export function separacionSapReducer(
  state: SeparacionSapState,
  action: SeparacionSapAction,
): SeparacionSapState {
  return (
    reduceInventario(state, action as InventarioAction) ??
    reduceCajas(state, action as CajasAction) ??
    reduceAuditoria(state, action as AuditoriaAction) ??
    reduceUi(state, action as UiAction) ??
    state
  );
}

export function validarCierreCaja(caja: CajaEntidad): string | null {
  if (!puedeTerminarCaja(caja)) {
    const llenos = subgruposLlenos(caja).length;
    if (llenos === 0) {
      return 'Debe completar al menos un Sub-Grupo antes de terminar la caja.';
    }
    return 'Hay un Sub-Grupo en progreso. Complete el pistoleo o cancele antes de terminar la caja.';
  }
  return null;
}
