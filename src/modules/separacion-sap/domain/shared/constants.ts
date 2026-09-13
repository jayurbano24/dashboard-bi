import type { TipoProductoId } from '../../types';

export const CENTROS_AUTORIZADOS = ['G945', 'G935', 'G944'] as const;
export const ALMACENES_DISPONIBLES = ['D000', 'D001', 'D002'] as const;
export const SUBGRUPOS_DISPONIBLES = ['LINEA_1', 'REPARACION', 'SCRAP', 'CALIDAD', 'STOCK_GENERAL'] as const;

export const TIPOS_PRODUCTO: Record<TipoProductoId, { id: TipoProductoId; label: string }> = {
  UNIDAD_COMPLETA: { id: 'UNIDAD_COMPLETA', label: 'Unidad completa' },
  TARJETA: { id: 'TARJETA', label: 'Tarjeta' },
};

export const ESTADOS_CAJA = {
  ABIERTA: 'ABIERTA',
  CERRADA: 'CERRADA',
  DESPACHADA: 'DESPACHADA',
} as const;

export const DOMAIN_ERRORS = {
  INVALID_SERIAL_LENGTH: 'Serie inválida. Longitud de dígitos no coincide con la especificación del modelo.',
  INVALID_SERIAL_FORMAT: 'Serie inválida. Solo se permiten caracteres numéricos.',
  INVALID_SERIAL_EMPTY: 'Por favor escanee o ingrese una serie.',
  SAP_NOT_LOADED: 'Debe cargar el archivo Excel de inventario SAP antes de capturar series.',
  BASE_NOT_FOUND: 'La serie no existe en el inventario SAP cargado. No se permite el ingreso.',
  CENTER_MISMATCH: 'El Centro de la serie no corresponde al Centro de la caja.',
  MATERIAL_MISMATCH: 'El material de la serie no corresponde al material de la caja.',
  DUPLICATE_SERIAL: 'La serie ya fue capturada en esta caja.',
  SERIAL_ALREADY_ASSIGNED: 'La serie ya pertenece a otra caja.',
  BOX_NOT_OPEN: 'Esta caja se encuentra sellada y cerrada.',
  BOX_QUANTITY_REACHED: 'Cantidad esperada ya completada. No se permiten más capturas.',
  BOX_CANNOT_CLOSE_INCOMPLETE: 'No se puede cerrar la caja: aún faltan series por capturar.',
  S1_S2_IDENTICAL: 'S-1 y S-2 no pueden ser idénticos para el mismo equipo.',
} as const;
