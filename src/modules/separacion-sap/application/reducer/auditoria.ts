import type { SeparacionSapState } from '../../types';

export type AuditoriaAction = {
  type: 'REGISTRAR_RECHAZO_AUDITORIA';
  payload: { cajaId: string; rawSerial: string; code: string; message: string };
};

export function reduceAuditoria(
  state: SeparacionSapState,
  action: AuditoriaAction,
): SeparacionSapState | null {
  if (action.type !== 'REGISTRAR_RECHAZO_AUDITORIA') return null;

  return {
    ...state,
    auditoriaRechazos: [
      {
        id: `RECH-${Date.now()}`,
        cajaId: action.payload.cajaId,
        rawSerial: action.payload.rawSerial,
        code: action.payload.code,
        message: action.payload.message,
        timestamp: new Date().toISOString(),
      },
      ...state.auditoriaRechazos,
    ],
  };
}
