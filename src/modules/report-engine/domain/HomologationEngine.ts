import { RawOrderData, ClaroReportRow } from '../shared/types';
import { CatalogEngine } from './CatalogEngine';
import { SLAEngine } from './SLAEngine';
import {
  CLARO_HISTORIAL_DATE_KEYS,
  resolveClaroDevolverDate,
} from '../shared/claro-date-sources';

export type ClaroHomologationContext = {
  /** Fechas agregadas desde historial_movimientos (labels de historial-status-columns). */
  historialDates?: Record<string, string>;
  origenFechas?: string;
};

export class HomologationEngine {
  private catalog: CatalogEngine;
  private slaEngine: SLAEngine;

  constructor(catalog: CatalogEngine, slaEngine: SLAEngine) {
    this.catalog = catalog;
    this.slaEngine = slaEngine;
  }

  /** Lógica legacy (payload / campos duplicados) — solo para scripts de comparación SLA. */
  public homologateRowLegacy(row: RawOrderData): ClaroReportRow {
    return this.buildRow(row, {
      createdAt: row.created_at || row.fecha,
      closedAt: row.closed_at ?? null,
      fechaEnvioTienda: row.fechaEnvioTienda,
      fechaReparacion: row.done_at || row.fecha_reparacion || null,
      fechaEnvioCac: row.closed_at ?? null,
      fechaEntregaCac: row.fecha_entrega ?? null,
      fechaGrupoGanado: null,
      fechaDevolver: null,
      origenFechas: '(legacy payload)',
    });
  }

  public homologateRow(row: RawOrderData, context: ClaroHomologationContext = {}): ClaroReportRow {
    const hist = context.historialDates ?? {};

    return this.buildRow(row, {
      createdAt: row.created_at ?? null,
      closedAt: row.closed_at ?? null,
      fechaEnvioTienda: hist[CLARO_HISTORIAL_DATE_KEYS.envioTiendaCac] || null,
      fechaReparacion: hist[CLARO_HISTORIAL_DATE_KEYS.reparacionCsa] || null,
      fechaEnvioCac: null,
      fechaEntregaCac: row.closed_at ?? null,
      fechaGrupoGanado: hist[CLARO_HISTORIAL_DATE_KEYS.grupoGanado] || null,
      fechaDevolver: resolveClaroDevolverDate(row, hist),
      origenFechas: context.origenFechas ?? '',
    });
  }

  private buildRow(
    row: RawOrderData,
    dates: {
      createdAt: unknown;
      closedAt: unknown;
      fechaEnvioTienda: unknown;
      fechaReparacion: unknown;
      fechaEnvioCac: unknown;
      fechaEntregaCac: unknown;
      fechaGrupoGanado: unknown;
      fechaDevolver: unknown;
      origenFechas: string;
    },
  ): ClaroReportRow {
    const getStr = (val: unknown): string => (val !== undefined && val !== null ? String(val).trim() : '');
    const parseDate = (val: unknown): Date | null => {
      if (!val) return null;
      const d = new Date(String(val));
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const formatDate = (d: Date | null): string => {
      if (!d) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const canalIngreso = getStr(row.canalIngreso || row.origen || row.dealer || row.sucursal);
    const tipoIngreso = getStr(row.tipoIngreso || row.operador || row.retail || row.dealer);

    const prefixMatch = canalIngreso.match(/^([A-Za-z0-9]+)/);
    const agencyPrefix = prefixMatch ? prefixMatch[1].toUpperCase() : '';
    const oficinaVentas = agencyPrefix.slice(0, 4).toUpperCase();

    const region = this.catalog.getRegion(agencyPrefix);
    const gamNoGam = this.catalog.isGam(region) ? 'GAM' : 'NO GAM';

    const createdDate = parseDate(dates.createdAt);
    const closedDate = parseDate(dates.closedAt);

    const slaResult = this.slaEngine.calculateSLA(createdDate, closedDate, region);

    const estadoOriginal = getStr(row.estado).toUpperCase();
    const estatus = ['ENTREGADO', 'CLOSED', 'CERRADO'].includes(estadoOriginal) ? 'REPARADO' : getStr(row.estado);

    const tipoOrden = getStr(row.tipo_orden || row.grupo);
    const garantiaVal = getStr(row.garantia).toUpperCase();
    let tiposDeGarantia = '';
    if (tipoOrden.toUpperCase().includes('REPARACION IW') || garantiaVal === 'SI' || garantiaVal === 'IW') {
      tiposDeGarantia = 'GARANTIA FABRICANTE';
    } else if (garantiaVal === 'NO' || garantiaVal === 'OW') {
      tiposDeGarantia = 'FUERA DE GARANTIA';
    }

    return {
      Taller: getStr(row.orderName),
      'Oficina Ventas': oficinaVentas,
      'CAC o Canal': canalIngreso,
      'Tipo Cliente': tipoIngreso,
      Cliente: getStr(row.cliente),
      Teléfono: getStr(row.telefono),
      'Fecha creación Folio': formatDate(createdDate),
      'Fecha envío por parte tienda CAC': formatDate(parseDate(dates.fechaEnvioTienda)),
      'Fecha Recepción Taller CSA': formatDate(createdDate),
      'Fecha reparación CSA': formatDate(parseDate(dates.fechaReparacion)),
      'Fecha Envío CAC': formatDate(parseDate(dates.fechaEnvioCac)),
      'Fecha entrega CAC': formatDate(parseDate(dates.fechaEntregaCac)),
      'Fecha Grupo Ganado': formatDate(parseDate(dates.fechaGrupoGanado)),
      'Fecha Devolver': formatDate(parseDate(dates.fechaDevolver)),
      'Origen de fechas': dates.origenFechas,
      SLA: slaResult.slaReal,
      'GAM / NO GAM': gamNoGam,
      Folio: getStr(row.folioPdv),
      IMEI: getStr(row.imei || row.serie),
      'Código SAP': getStr(row.modeloSap),
      'Fecha Activación': getStr(row.fechaFacturacion || row.fechaActivacion),
      Marca: getStr(row.marcaDispositivo || row.marca),
      'Modelo SAP': getStr(row.modeloSap || row.modelo),
      'Fecha Facturación': getStr(row.fechaFacturacion),
      Falla: getStr(row.falla),
      Garantía: getStr(row.garantia) || 'IW',
      'Motivo por que no aplica': getStr(row.motivoNoAplica),
      'Usuario o Técnico': getStr(row.tecnico),
      'No Guía envío CAC': getStr(row.numeroGuia),
      'No Guía recibió Taller': getStr(row.guiaRecibio),
      'Falla reportada por Tienda': getStr(row.falla || row.serviciosObras),
      'Reparación realizada': getStr(row.serviciosObras),
      Estatus: estatus,
      'Justificación fuera SLA': getStr(row.justificacionTiempo),
      'Tipos de Garantía': tiposDeGarantia,

      'SLA Objetivo': slaResult.slaObjetivo,
      'SLA Real': slaResult.slaReal,
      'Diferencia SLA': slaResult.diferenciaSla,
      'Horas Excedidas': slaResult.horasExcedidas,
      'Estado SLA': slaResult.estadoSla,
      Cumplimiento: slaResult.cumplimiento,
      'Tiempo Restante': slaResult.tiempoRestante,
    };
  }
}
