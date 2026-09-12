import { getOrderryCustomField } from '@/lib/orderry-order-snapshot';
import { isPronetOrder, PronetReportRow } from '../shared/pronet-config';
import { RawOrderData } from '../shared/types';

const getStr = (val: unknown): string =>
  val !== undefined && val !== null ? String(val).trim() : '';

const parseDate = (val: unknown): Date | null => {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Formato D/M/YYYY como plantilla PRONET. */
const formatDateDMY = (d: Date | null): string => {
  if (!d) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

const isCanalMarker = (value: string): boolean => {
  const norm = value.toUpperCase();
  return norm.includes('FUNDACION GENESIS') || norm.includes('FUNDACIÓN GENESIS');
};

const isConduceCode = (value: string): boolean => /^TCSAL-\d+$/i.test(value.trim());

const isCourierGuia = (value: string): boolean => {
  const norm = value.trim().replace(/'/g, '-');
  if (!norm || norm.length > 24) return false;
  if (isCanalMarker(norm)) return false;
  if (/carretera|calle|avenida|av\.|zona|km\.?|local|cc\.|edificio|colonia|departamento/i.test(norm)) {
    return false;
  }
  return /^417\d{6,}[-']?\d*$/.test(norm) || /^\d{8,}[-']?\d*$/.test(norm);
};

/** Solo conduce + número de guía courier (sin dirección ni IN COURIER). */
const pickNumeroGuia = (row: RawOrderData): string => {
  const parts: string[] = [];
  const conduce = getStr(row.conduceId);
  const guia = getStr(row.numeroGuia);

  if (isConduceCode(conduce)) parts.push(conduce);
  if (isCourierGuia(guia)) parts.push(guia);

  return parts.join(' / ');
};

/** CANAL DE INGRESO → Sucursal */
const pickSucursal = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const cf = raw.custom_fields as Record<string, unknown> | undefined;

  return (
    getStr(row.canalIngreso) ||
    getOrderryCustomField(cf, 'CANAL DE INGRESO', 'Canal de Ingreso') ||
    pickRaw(row, 'CANAL DE INGRESO', 'CANAL INGRESO', 'Canal de Ingreso') ||
    getStr(row.origen) ||
    ''
  );
};

/** GARANTIA → Si/No */
const pickGarantiaSiNo = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const cf = raw.custom_fields as Record<string, unknown> | undefined;
  const val =
    getStr(row.garantia) ||
    getOrderryCustomField(cf, 'GARANTIA', 'garantia') ||
    pickRaw(row, 'GARANTIA', 'Garantía del dispositivo', 'Garantía');

  const norm = val.toUpperCase();
  if (!norm) return '';
  if (norm === 'SI' || norm === 'SÍ' || norm === 'YES' || norm === 'TRUE' || norm === '1') return 'SI';
  if (norm === 'NO' || norm === 'FALSE' || norm === '0') return 'NO';
  return val.toUpperCase();
};

/** Número de serie → IMEI */
const pickImei = (row: RawOrderData): string =>
  getStr(row.imei || row.serie) ||
  pickRaw(row, 'Número de serie', 'Número de serie / IMEI', 'serial', 'IMEI', 'imei');

/** Mal funcionamiento → Diagnostico */
const pickDiagnostico = (row: RawOrderData): string =>
  getStr(row.falla) ||
  pickRaw(row, 'Mal funcionamiento *', 'Mal funcionamiento', 'Defecto (Mal funcionamiento)');

/** Tipo de orden → Ingreso */
const pickIngreso = (row: RawOrderData): string =>
  getStr(row.tipo_orden) ||
  pickRaw(row, 'Tipo de orden', 'Tipo de Orden', 'order_type') ||
  getStr(row.tipoIngreso);

/** Servicios/Obras → REPARACION */
const pickReparacion = (row: RawOrderData): string => {
  const works = pickRaw(row, 'works', 'Servicios/Obras', 'Trabajos de reparación', 'Reparación realizada');
  if (works) return works;
  return getStr(row.serviciosObras);
};

/** Notas del técnico → Nuevo IMEI (formato Orderry: "NEW 869084087099283" o "NEW PN-869580087706587"). */
const pickNuevoImei = (row: RawOrderData): string => {
  const notes = pickRaw(row, 'engineer_notes', 'NOTA', 'nota');
  if (!notes) return '';

  const imeiActual = pickImei(row);
  const newLine = notes.match(/\bNEW\b[^\n]*/i)?.[0] || notes;
  const dashedImei = newLine.match(/-(\d{14,17})\b/)?.[1];
  if (dashedImei && dashedImei !== imeiActual) return dashedImei;

  const plainNew = newLine.match(/\bNEW\s+(\d{14,17})\b/i)?.[1];
  if (plainNew && plainNew !== imeiActual) return plainNew;

  const candidates = notes.match(/\b\d{14,17}\b/g) || [];
  return candidates.find((n) => n !== imeiActual) || '';
};

const pickDni = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const cf = raw.custom_fields as Record<string, unknown> | undefined;
  const client = raw.client as { custom_fields?: Record<string, unknown> } | undefined;

  return (
    pickRaw(row, 'DNI', 'DPI', 'Documento', 'documento', 'Cédula', 'cedula') ||
    getOrderryCustomField(cf, 'DNI', 'DPI', 'Documento') ||
    getOrderryCustomField(client?.custom_fields, 'DNI', 'DPI', 'Documento') ||
    ''
  );
};

const pickPoblacion = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const cf = raw.custom_fields as Record<string, unknown> | undefined;

  return (
    pickRaw(row, 'POBLACION', 'Población', 'poblacion', 'Ciudad', 'ciudad') ||
    getOrderryCustomField(cf, 'POBLACION', 'DIRECCION SUCURSAL') ||
    ''
  );
};

const pickTelefono = (row: RawOrderData): string => {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const client = raw.client as { phone?: string; phones?: Array<{ number?: string }> } | undefined;
  const fromPhones = client?.phones?.map((p) => p.number).find(Boolean);

  return (
    getStr(row.telefono) ||
    getStr(client?.phone) ||
    getStr(fromPhones) ||
    pickRaw(row, 'Teléfono del cliente', 'phone', 'telefono')
  );
};

const pickNombreCliente = (row: RawOrderData): string =>
  getStr(row.cliente) ||
  pickRaw(row, 'Nombre del cliente', 'client_name', 'Nombre del Cliente') ||
  getStr(row.retail);

export class GeneratePronetReportUseCase {
  public execute(rows: RawOrderData[]): PronetReportRow[] {
    const report: PronetReportRow[] = [];

    for (const row of rows) {
      if (!isPronetOrder(row)) continue;

      const createdDate = parseDate(row.created_at || pickRaw(row, 'Creado en', 'Creado'));

      report.push({
        'Fecha de Ingreso': formatDateDMY(createdDate),
        'Orden de servicio': getStr(row.orderName) || pickRaw(row, 'Orden #', 'Orden'),
        'Numero de Guia': pickNumeroGuia(row),
        IMEI: pickImei(row),
        Marca: getStr(row.marcaDispositivo || row.marca) || pickRaw(row, 'Marca del dispositivo', 'Marca'),
        Modelo: getStr(row.modeloDispositivo || row.modelo) || pickRaw(row, 'Modelo de dispositivo', 'Modelo'),
        DNI: pickDni(row),
        'Nombre del Cliente': pickNombreCliente(row),
        Población: pickPoblacion(row),
        Sucursal: pickSucursal(row),
        'Garantia Si/No': pickGarantiaSiNo(row),
        Diagnostico: pickDiagnostico(row),
        Ingreso: pickIngreso(row),
        REPARACION: pickReparacion(row),
        'Nuevo IMEI': pickNuevoImei(row),
        ESTATUS: getStr(row.estado || row.status_live) || pickRaw(row, 'Estado'),
        'Teléfono del cliente': pickTelefono(row),
      });
    }

    return report;
  }
}
