export type TipoProductoId = 'UNIDAD_COMPLETA' | 'TARJETA';
export type EstadoCaja = 'ABIERTA' | 'CERRADA' | 'DESPACHADA';
export type EstadoSubgrupo = 'EN_PROGRESO' | 'LLENO' | 'PENDIENTE_VALIDAR_SAP';
export type ValoracionSubgrupo = 'VALORADO' | 'NO_VALORADO' | 'PENDIENTE';
export type EsquemaSeries = 'S1' | 'S1_S2';
export type SapSerieNotFoundBehavior = 'BLOCK' | 'PENDING' | 'ALLOW';
export type SeparacionSapVista = 'cajas' | 'bsd' | 'auditoria' | 'dashboard';

export interface BsdEquipo {
  materialCodigo: string;
  materialTexto: string;
  normalizedSerial: string;
  centro: string;
  almacen: string;
  lote: string;
  statusSistema: string;
}

export interface CapturaSerie {
  id: string;
  cajaId: string;
  subgrupoId?: string;
  normalizedSerial: string;
  normalizedSerialS2?: string | null;
  esquemaSeries?: EsquemaSeries;
  materialCodigo: string;
  materialTexto?: string;
  centro: string;
  almacen: string;
  lote: string;
  statusBsd: string;
  statusCaptura: string;
  capturedAt: string;
  capturedBy?: string;
}

export interface CajaSubgrupo {
  id: string;
  marca: string;
  modelo: string;
  tipoProducto: TipoProductoId;
  materialCodigo: string;
  materialTexto: string;
  cantidadEsperada: number;
  cantidadCapturada: number;
  longitudDigitos: number;
  esquemaSeries: EsquemaSeries;
  estado: EstadoSubgrupo;
  valoracion: ValoracionSubgrupo | null;
  cantidadDisponibleSap: number | null;
}

export interface CajaEntidad {
  id: string;
  numeroCaja: string;
  centro: string;
  almacen: string;
  estado: EstadoCaja;
  ubicacion: string;
  tarima: string;
  observaciones: string;
  creadaEn: string;
  cerradaEn: string | null;
  despachadaEn: string | null;
  createdBy?: string | null;
  subgrupos: CajaSubgrupo[];
  capturas: CapturaSerie[];
}

/** Material SAP agregado desde inventario BSD (solo lectura, derivado del Excel). */
export interface MaterialSap {
  codigo: string;
  texto: string;
  marca: string;
  modelo: string;
  origen: string;
  almacenes: string[];
  cantidadEnBsdG945: number;
  ultimaActualizacion: string;
}

export interface AuditoriaRechazo {
  id: string;
  cajaId: string;
  rawSerial: string;
  code: string;
  message: string;
  timestamp: string;
}

export interface SeparacionSapState {
  secuenciaCaja: number;
  materialesSap: MaterialSap[];
  bsdEquipos: BsdEquipo[];
  cajas: CajaEntidad[];
  auditoriaRechazos: AuditoriaRechazo[];
  errorGlobal: string | null;
  notificacionExito: string | null;
  sonidoHabilitado: boolean;
  ultimaSincronizacionG945: string;
  sapArchivoNombre: string | null;
  sapCargadoEn: string | null;
  inventarioCargando: boolean;
  cajasCargando: boolean;
}

export type CaptureResult =
  | { success: true; code: 'BASE_ENCONTRADO'; message: string; captura: CapturaSerie; subgrupoId: string }
  | { success: false; code: string; message: string; serial?: string };

export type SerieLookupResult =
  | {
      success: true;
      code: 'BASE_ENCONTRADO';
      normalizedSerial: string;
      materialCodigo: string;
      materialTexto: string;
      centro: string;
      almacen: string;
      lote: string;
      statusSistema: string;
      valoracion: ValoracionSubgrupo;
      cantidadDisponibleSap: number;
      marcaInferida: string;
      modeloInferido: string;
      longitudDigitos: number;
    }
  | { success: false; code: string; message: string; serial?: string };

export type DuplicadoSerieInfo = {
  normalizedSerial: string;
  cajaId: string;
  numeroCaja: string;
  subgrupoId: string | null;
  materialCodigo: string;
  materialTexto: string;
};

export type SerieParseResult =
  | { ok: true; value: string }
  | { ok: false; code: string; message: string };

export type CrearSubgrupoInput = {
  marca: string;
  modelo: string;
  tipoProducto: TipoProductoId;
  materialCodigo: string;
  materialTexto: string;
  cantidadEsperada: number;
  longitudDigitos: number;
  esquemaSeries: EsquemaSeries;
};
