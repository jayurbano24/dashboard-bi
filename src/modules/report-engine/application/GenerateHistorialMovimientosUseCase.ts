import { HistorialMovimientosTemplateEngine } from '../domain/HistorialMovimientosTemplateEngine';
import {
  emptyHistorialStatusDates,
  resolveStatusDateColumnLabel,
} from '../shared/historial-status-columns';
import { HistorialMovimientosReportRow } from '../shared/historial-types';
import { RawOrderData } from '../shared/types';

const formatDateTime = (val: unknown): string => {
  if (!val) return '';
  const d = new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const pickKindofGood = (raw: Record<string, unknown>): string => {
  const kg = raw.kindof_good;
  if (typeof kg === 'string') return kg.trim();
  if (kg && typeof kg === 'object' && 'name' in kg) {
    return String((kg as { name?: string }).name || '').trim();
  }
  return '';
};

const pickRaw = (row: RawOrderData, ...keys: string[]): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  for (const key of keys) {
    const val = raw[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
};

export class GenerateHistorialMovimientosUseCase {
  public execute(
    rows: RawOrderData[],
    historialDatesByOrder: Map<string, Record<string, string>>,
    historialOrigenByOrder: Map<string, string> = new Map(),
  ): HistorialMovimientosReportRow[] {
    const report: HistorialMovimientosReportRow[] = [];
    const emptyDates = emptyHistorialStatusDates();

    for (const row of rows) {
      const orderKey = row.orderId ? String(row.orderId) : String(row.orderName || '').trim();
      if (!orderKey) continue;

      const raw = (row.rawRecord || {}) as Record<string, unknown>;
      const histRaw = historialDatesByOrder.get(orderKey) ?? {};
      const statusDates: Record<string, string> = { ...emptyDates };
      for (const [label, fecha] of Object.entries(histRaw)) {
        if (label in statusDates && fecha) {
          statusDates[label] = formatDateTime(fecha);
        }
      }

      const creadoEn = formatDateTime(pickRaw(row, 'Creado en', 'Creado') || row.created_at);
      const estadoActual =
        String((row as Record<string, unknown>).status_live || '').trim()
        || pickRaw(row, 'Estado', 'estado')
        || row.estado
        || '';
      const statusIdRaw = raw.status as { id?: number } | undefined;
      const statusId =
        typeof statusIdRaw?.id === 'number'
          ? statusIdRaw.id
          : typeof (row as Record<string, unknown>).statusId === 'number'
            ? ((row as Record<string, unknown>).statusId as number)
            : null;

      if (!statusDates['Fecha Orden Creada'] && creadoEn) {
        statusDates['Fecha Orden Creada'] = creadoEn;
      }

      const currentStateCol = resolveStatusDateColumnLabel(estadoActual, statusId);
      if (currentStateCol && !statusDates[currentStateCol]) {
        const modifiedAt =
          (row as Record<string, unknown>).modified_at
          || raw.modified_at
          || row.closed_at
          || row.done_at
          || row.created_at;
        const fallback = formatDateTime(modifiedAt);
        if (fallback) statusDates[currentStateCol] = fallback;
      }

      const snapshot: HistorialMovimientosReportRow = {
        'Orden #': pickRaw(row, 'Orden #', 'id') || row.orderName || orderKey,
        'Creado en': creadoEn,
        'Tipo de orden': pickRaw(row, 'Tipo de orden', 'order_type') || row.tipo_orden || '',
        'Estado actual': estadoActual,
        'Nombre del cliente': pickRaw(row, 'Nombre del cliente', 'client_name') || row.cliente || '',
        'Grupo de dispositivo':
          pickRaw(row, 'Grupo de dispositivos', 'grupo_dispositivo', 'Dispositivo')
          || pickKindofGood(raw)
          || String((raw.asset as { group?: string } | undefined)?.group || ''),
        'Marca': pickRaw(row, 'Marca del dispositivo', 'Marca', 'brand') || row.marca || '',
        'Modelo': pickRaw(row, 'Modelo de dispositivo', 'Modelo', 'model') || row.modelo || '',
        'Número de serie': pickRaw(row, 'Número de serie / IMEI', 'serial') || row.serie || '',
        'IMEI': row.imei || pickRaw(row, 'Número de serie / IMEI', 'serial') || '',
        'Completado en': formatDateTime(row.done_at || row.fecha_reparacion),
        'Cerrado': formatDateTime(row.closed_at),
        'Servicios/Obras': row.serviciosObras || pickRaw(row, 'Trabajos de reparación', 'works') || '',
        'Mal funcionamiento': row.falla || pickRaw(row, 'Mal funcionamiento', 'Defecto (Mal funcionamiento)') || '',
        'Fecha de venta - POP': pickRaw(row, 'Fecha de venta -pop', 'FECHA DE VENTA -POP') || row.fechaFacturacion || '',
        'Color': (() => {
          const c =
            String((row as Record<string, unknown>).color_live || '').trim()
            || pickRaw(row, 'COLOR', 'Color')
            || String(raw.COLOR || raw.color || '');
          return c === 'N/A' ? '' : c;
        })(),
        'Nota historial': historialOrigenByOrder.get(orderKey) || '',
        'PDV-TK': pickRaw(row, 'FOLIO PDV') || String((row as Record<string, unknown>).folioPdv || ''),
        'Garantía': row.garantia || pickRaw(row, 'GARANTIA', 'Garantía del dispositivo') || '',
        'Tipo de ingreso': row.tipoIngreso || pickRaw(row, 'TIPO DE INGRESO') || row.operador || '',
        'Canal de ingreso': row.canalIngreso || pickRaw(row, 'CANAL DE INGRESO', 'CANAL INGRESO') || row.origen || '',
        'IN Courier': pickRaw(row, 'IN COURIER') || '',
        ...statusDates,
      };

      report.push(snapshot);
    }

    void HistorialMovimientosTemplateEngine.getColumns();
    return report;
  }
}
