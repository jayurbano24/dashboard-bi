import { normalizeEstadoLabel } from '@/lib/historial-estado-normalize';

export type HistorialStatusDateColumn = {
  /** Encabezado en Excel / reporte */
  label: string;
  /** Nombres canónicos en Orderry (estados_catalogo.estado) */
  orderryNames: string[];
  /** IDs Orderry opcionales para match exacto */
  statusIds?: number[];
};

/**
 * Columnas de fecha por estado — orden de exportación.
 * orderryNames provienen de GET /v2/orders/statuses (cuenta TC).
 */
export const HISTORIAL_STATUS_DATE_COLUMNS: HistorialStatusDateColumn[] = [
  { label: 'Fecha Orden Creada', orderryNames: ['ORDEN CREADA'], statusIds: [1297313] },
  { label: 'Fecha Pendiente de Recolección', orderryNames: ['PENDIENTE DE RECOLECCION'], statusIds: [1297927] },
  { label: 'Fecha En Tránsito a CSA', orderryNames: ['EN TRANSITO A CSA'], statusIds: [1300761] },
  { label: 'Fecha Validación SAP', orderryNames: ['VALIDACION SAP'], statusIds: [1311245] },
  { label: 'Fecha Pre-Diagnóstico', orderryNames: ['PRE-DIAGNOSTICO'], statusIds: [1323417] },
  { label: 'Fecha En Diagnóstico', orderryNames: ['EN DIAGNOSTICO'], statusIds: [1297326] },
  { label: 'Fecha En Reparación', orderryNames: ['EN REPARACION'], statusIds: [1297329] },
  { label: 'Fecha Validación DOA / DAP', orderryNames: ['VALIDACION DOA / DAP'], statusIds: [1310371] },
  { label: 'Fecha Mantenimiento', orderryNames: ['MANTENIMIENTO'], statusIds: [1311209] },
  { label: 'Fecha Esperando Aprobación', orderryNames: ['ESPERANDO APROBACION'], statusIds: [1297322] },
  { label: 'Fecha Reemplazo Tarjeta / CU', orderryNames: ['REMPLAZO DE TARJETA/ C.U.', 'REEMPLAZO DE TARJETA/ C.U.'], statusIds: [1297323] },
  { label: 'Fecha Escalada Nota de Crédito', orderryNames: ['ESCALADA PARA NOTA DE CREDITO.', 'ESCALADA PARA NOTA DE CREDITO'], statusIds: [1297321] },
  { label: 'Fecha Escalado al Fabricante', orderryNames: ['ESCALADO AL FABRICANTE'], statusIds: [1297324] },
  { label: 'Fecha Solicitud de Repuestos', orderryNames: ['SOLICITUD DE REPUESTOS'], statusIds: [1297928] },
  { label: 'Fecha Escalado Life-One', orderryNames: ['ESCALADO LIFE-ONE'], statusIds: [1314653] },
  { label: 'Fecha Presupuesto Rechazado', orderryNames: ['PRESUPUESTO RECHAZADO'], statusIds: [1297314] },
  { label: 'Fecha En Control de Calidad', orderryNames: ['EN CONTROL DE CALIDAD'], statusIds: [1297931] },
  { label: 'Fecha Nota de Crédito Aprobada', orderryNames: ['NOTA DE CREDITO APROBADA'], statusIds: [1606763] },
  { label: 'Fecha No Reparado', orderryNames: ['NO REPARADO'], statusIds: [1611131] },
  { label: 'Fecha Para Devolución', orderryNames: ['PARA DEVOLUCIÓN', 'PARA DEVOLUCION'], statusIds: [1297296] },
  { label: 'Fecha Para Devolución al CAC', orderryNames: ['PARA DEVOLUCIÓN AL CAC', 'PARA DEVOLUCION AL CAC'], statusIds: [1300762] },
  { label: 'Fecha Para Devolución Nota Crédito', orderryNames: ['PARA DEVOLUCIÓN NOTA DE CRÉDITO', 'PARA DEVOLUCION NOTA DE CREDITO'], statusIds: [1311208] },
  { label: 'Fecha Para Devolución Life-One', orderryNames: ['PARA DEVOLUCIÓN LIFE ONE', 'PARA DEVOLUCION LIFE ONE'], statusIds: [1314652] },
  { label: 'Fecha Devolución Cambio en Agencia', orderryNames: ['DEVOLUCION CAMBIO EN AGENCIA'], statusIds: [1322780] },
  { label: 'Fecha Para Devolver a Bodega SAP', orderryNames: ['PARA DEVOLVER A BODEGA/SAP'], statusIds: [1359544] },
  { label: 'Fecha Entregado', orderryNames: ['ENTREGADO'], statusIds: [1297299] },
  { label: 'Fecha Archivado', orderryNames: ['Archivado', 'ARCHIVADO'], statusIds: [1297300] },
  { label: 'Fecha Entregado Nota de Crédito', orderryNames: ['ENTREGADO-NOTA DE CREDITO'], statusIds: [1311246] },
  { label: 'Fecha Entregado Life-One', orderryNames: ['ENTREGADO/LIFE-ONE'], statusIds: [1314651] },
  { label: 'Fecha Bodega Claro G945/G935', orderryNames: ['BODEGA CLARO G945/G935'], statusIds: [1359504] },
  { label: 'Fecha Almacenado Life-One', orderryNames: ['ALMACENADO LIFE-ONE'], statusIds: [1606047] },
  { label: 'Fecha Entregado Cambio en Agencia', orderryNames: ['ENTREGADO -- CAMBIO EN AGENCIA', 'ENTREGADO - CAMBIO EN AGENCIA'], statusIds: [1606050] },
  { label: 'Fecha Despachado CAEX', orderryNames: ['DESPACHADO CAEX'], statusIds: [1607615] },
  { label: 'Fecha Bodega Defectuoso DTI', orderryNames: ['BODEGA PRODUCTO DEFECTUOSO - DTI'], statusIds: [1607616] },
  { label: 'Fecha Bad Warehouse B+D', orderryNames: ['BAD WAREOUSE B+D', 'BAD WAREHOUSE B+D'], statusIds: [1607618] },
  { label: 'Fecha Cancelada por Precio', orderryNames: ['Cancelada - precio', 'CANCELADA - PRECIO'], statusIds: [1297308] },
  { label: 'Fecha Cancelada por Plazos', orderryNames: ['Cancelada - plazos', 'CANCELADA - PLAZOS'], statusIds: [1297306] },
  { label: 'Fecha Cancelada por Calidad', orderryNames: ['Cancelada - calidad', 'CANCELADA - CALIDAD'], statusIds: [1297307] },
  { label: 'Fecha G935/G945 Despachado', orderryNames: ['G935/G945- DESPACHADO'], statusIds: [1607613] },
  { label: 'Fecha Salida Definitiva Life-One', orderryNames: ['ENTREGADO - LIFE-ONE'], statusIds: [1607614] },
  { label: 'Fecha Salida Defectuoso DTI', orderryNames: ['ENTREGADO PROD. DEFECTUOSO DTI'], statusIds: [1607617] },
  { label: 'Fecha Salida Definitivo B+D', orderryNames: ['ENTREGADO: B+D'], statusIds: [1613527] },
];

const normalizedMatchIndex = HISTORIAL_STATUS_DATE_COLUMNS.flatMap((col) =>
  col.orderryNames.map((name) => ({
    norm: normalizeEstadoLabel(name),
    label: col.label,
    statusIds: col.statusIds ?? [],
  })),
);

const statusIdIndex = new Map<number, string>();
for (const col of HISTORIAL_STATUS_DATE_COLUMNS) {
  for (const id of col.statusIds ?? []) {
    statusIdIndex.set(id, col.label);
  }
}

export function emptyHistorialStatusDates(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of HISTORIAL_STATUS_DATE_COLUMNS) {
    out[col.label] = '';
  }
  return out;
}

export function aggregateHistorialStatusDates(
  rows: Array<{
    estado_nuevo?: string | null;
    status_id_nuevo?: number | null;
    fecha_hora_cambio: string;
  }>,
): Record<string, string> {
  const out = emptyHistorialStatusDates();

  for (const row of rows) {
    const fecha = row.fecha_hora_cambio;
    if (!fecha) continue;

    let label: string | undefined;
    const statusId = Number(row.status_id_nuevo);
    if (Number.isFinite(statusId) && statusId > 0) {
      label = statusIdIndex.get(statusId);
    }
    if (!label && row.estado_nuevo) {
      const norm = normalizeEstadoLabel(row.estado_nuevo);
      const hit = normalizedMatchIndex.find((m) => m.norm === norm);
      label = hit?.label;
    }
    if (!label) continue;

    const prev = out[label];
    if (!prev || new Date(fecha).getTime() < new Date(prev).getTime()) {
      out[label] = fecha;
    }
  }

  return out;
}

export function getHistorialStatusDateColumnLabels(): string[] {
  return HISTORIAL_STATUS_DATE_COLUMNS.map((c) => c.label);
}

/** Columna de fecha Excel que corresponde al estado actual de la orden. */
export function resolveStatusDateColumnLabel(
  estado: string | null | undefined,
  statusId?: number | null,
): string | undefined {
  const id = Number(statusId);
  if (Number.isFinite(id) && id > 0) {
    const byId = statusIdIndex.get(id);
    if (byId) return byId;
  }
  if (!estado) return undefined;
  const norm = normalizeEstadoLabel(estado);
  return normalizedMatchIndex.find((m) => m.norm === norm)?.label;
}
