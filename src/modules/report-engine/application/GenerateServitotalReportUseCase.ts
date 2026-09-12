import { getOrderryCustomField } from '@/lib/orderry-order-snapshot';
import { CLARO_GRUPO_ENTREGA_LABEL } from '../shared/claro-date-sources';
import { isServitotalClient, ServitotalReportRow } from '../shared/servitotal-config';
import { RawOrderData } from '../shared/types';

const getStr = (val: unknown): string =>
  val !== undefined && val !== null ? String(val).trim() : '';

const parseDate = (val: unknown): Date | null => {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Formato M/D/YYYY como en plantilla Servitotal (9/4/2026). */
const formatDateIngress = (d: Date | null): string => {
  if (!d) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
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

const pickProducto = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const kg = raw.kindof_good;
  if (typeof kg === 'string' && kg.trim()) return kg.trim();
  if (kg && typeof kg === 'object' && 'name' in kg) {
    const name = String((kg as { name?: string }).name || '').trim();
    if (name) return name;
  }
  return (
    pickRaw(row, 'Grupo de dispositivos', 'grupo_dispositivo') ||
    getStr(row.grupo) ||
    ''
  );
};

/** Servitotal usa IN COURIER (f3151083) como folio de entrega, no FOLIO PDV. */
const pickFolio = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const cf = raw.custom_fields as Record<string, unknown> | undefined;

  return (
    pickRaw(row, 'IN COURIER', 'inCourier') ||
    getOrderryCustomField(cf, 'IN COURIER') ||
    getStr(row.folioPdv) ||
    pickRaw(row, 'FOLIO PDV', 'folioPdv')
  );
};

const pickEntregadoDate = (
  row: RawOrderData,
  historialDates: Record<string, string>,
): Date | null => {
  const closed = parseDate(row.closed_at);
  if (closed) return closed;

  const fromHistorial = parseDate(historialDates['Fecha Entregado']);
  if (fromHistorial) return fromHistorial;

  const estado = getStr(row.estado || row.status_live).toUpperCase();
  if (estado.includes('ENTREGADO') || estado.includes('CONTROL DE CALIDAD')) {
    return parseDate(row.done_at);
  }

  return null;
};

export class GenerateServitotalReportUseCase {
  public execute(
    rows: RawOrderData[],
    historialDatesByOrder: Map<string, Record<string, string>> = new Map(),
  ): ServitotalReportRow[] {
    const report: ServitotalReportRow[] = [];

    for (const row of rows) {
      const cliente =
        getStr(row.cliente) ||
        pickRaw(row, 'Nombre del cliente', 'client_name') ||
        getStr(row.retail);

      if (!isServitotalClient(cliente)) continue;

      const orderKey = row.orderId ? String(row.orderId) : String(row.orderName || '').trim();
      const historialDates = historialDatesByOrder.get(orderKey) ?? {};

      const createdDate = parseDate(row.created_at);
      const entregadoDate = pickEntregadoDate(row, historialDates);
      const fechaDevolver = parseDate(historialDates[CLARO_GRUPO_ENTREGA_LABEL]);

      const reparacion =
        getStr(row.serviciosObras) ||
        pickRaw(row, 'Servicios/Obras', 'works', 'Reparación realizada', 'engineer_notes');

      const falla =
        getStr(row.falla) ||
        pickRaw(row, 'Mal funcionamiento *', 'Mal funcionamiento', 'Mal funcionamiento');

      report.push({
        'FECHA INGRESO': formatDateIngress(createdDate),
        ORDEN: getStr(row.orderName),
        ESTADO: getStr(row.estado || row.status_live),
        CLIENTE: cliente.toUpperCase(),
        PRODUCTO: pickProducto(row).toUpperCase(),
        MARCA: getStr(row.marcaDispositivo || row.marca).toUpperCase(),
        MODELO: getStr(row.modeloDispositivo || row.modelo).toUpperCase(),
        FOLIO: pickFolio(row),
        'Fecha para Devolver': formatDateIngress(fechaDevolver),
        ENTREGADO: formatDateIngress(entregadoDate),
        REPARACION: reparacion.toUpperCase(),
        'MAL FUNCIONAMIENTO': falla.toUpperCase(),
      });
    }

    return report;
  }
}
