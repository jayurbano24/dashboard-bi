import type { SeparacionSapState } from '../types';

export function createInitialSeparacionSapState(): SeparacionSapState {
  return {
    secuenciaCaja: 1,
    materialesSap: [],
    bsdEquipos: [],
    cajas: [],
    auditoriaRechazos: [],
    errorGlobal: null,
    notificacionExito: null,
    sonidoHabilitado: true,
    ultimaSincronizacionG945: '',
    sapArchivoNombre: null,
    sapCargadoEn: null,
    inventarioCargando: true,
    cajasCargando: true,
  };
}
