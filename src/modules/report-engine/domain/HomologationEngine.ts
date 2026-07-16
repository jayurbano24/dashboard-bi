import { RawOrderData, ClaroReportRow } from '../shared/types';
import { CatalogEngine } from './CatalogEngine';
import { SLAEngine } from './SLAEngine';

export class HomologationEngine {
  private catalog: CatalogEngine;
  private slaEngine: SLAEngine;

  constructor(catalog: CatalogEngine, slaEngine: SLAEngine) {
    this.catalog = catalog;
    this.slaEngine = slaEngine;
  }

  public homologateRow(row: RawOrderData): ClaroReportRow {
    const getStr = (val: any): string => (val !== undefined && val !== null ? String(val).trim() : '');
    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };
    const formatDate = (d: Date | null): string => {
      if (!d) return '';
      try {
        const pad = (n: number) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
      } catch {
        return d.toISOString().slice(0, 16).replace('T', ' ');
      }
    };

    const canalIngreso = getStr(row.canalIngreso || row.origen || row.dealer || row.sucursal);
    const tipoIngreso = getStr(row.tipoIngreso || row.operador || row.retail || row.dealer);
    
    const prefixMatch = canalIngreso.match(/^([A-Za-z0-9]+)/);
    const agencyPrefix = prefixMatch ? prefixMatch[1].toUpperCase() : '';
    const oficinaVentas = agencyPrefix.slice(0, 4).toUpperCase();

    const region = this.catalog.getRegion(agencyPrefix);
    const gamNoGam = this.catalog.isGam(region) ? 'GAM' : 'NO GAM';

    const createdDate = parseDate(row.created_at || row.fecha);
    const doneDate = parseDate(row.done_at || row.fecha_reparacion || null);
    const closedDate = parseDate(row.closed_at ?? null); 
    const deliveredDate = parseDate(row.fecha_entrega ?? null); 

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
      'Taller': getStr(row.orderName),
      'Oficina Ventas': oficinaVentas,
      'CAC o Canal': canalIngreso,
      'Tipo Cliente': tipoIngreso,
      'Cliente': getStr(row.cliente),
      'Teléfono': getStr(row.telefono),
      'Fecha creación Folio': formatDate(createdDate),
      'Fecha envío por parte tienda CAC': getStr(row.fechaEnvioTienda),
      'Fecha Recepción Taller CSA': formatDate(createdDate),
      'Fecha reparación CSA': formatDate(doneDate),
      'Fecha Envío CAC': formatDate(closedDate),
      'Fecha entrega CAC': formatDate(deliveredDate),
      'SLA': slaResult.slaReal,
      'GAM / NO GAM': gamNoGam,
      'Folio': getStr(row.folioPdv),
      'IMEI': getStr(row.imei || row.serie),
      'Código SAP': getStr(row.modeloSap), 
      'Fecha Activación': getStr(row.fechaFacturacion || row.fechaActivacion), 
      'Marca': getStr(row.marcaDispositivo || row.marca),
      'Modelo SAP': getStr(row.modeloSap || row.modelo),
      'Fecha Facturación': getStr(row.fechaFacturacion),
      'Falla': getStr(row.falla),
      'Garantía': getStr(row.garantia) || 'IW',
      'Motivo por que no aplica': getStr(row.motivoNoAplica),
      'Usuario o Técnico': getStr(row.tecnico),
      'No Guía envío CAC': getStr(row.numeroGuia),
      'No Guía recibió Taller': getStr(row.guiaRecibio),
      'Falla reportada por Tienda': getStr(row.falla || row.serviciosObras),
      'Reparación realizada': getStr(row.serviciosObras),
      'Estatus': estatus,
      'Justificación fuera SLA': getStr(row.justificacionTiempo),
      'Tipos de Garantía': tiposDeGarantia,
      
      'SLA Objetivo': slaResult.slaObjetivo,
      'SLA Real': slaResult.slaReal,
      'Diferencia SLA': slaResult.diferenciaSla,
      'Horas Excedidas': slaResult.horasExcedidas,
      'Estado SLA': slaResult.estadoSla,
      'Cumplimiento': slaResult.cumplimiento,
      'Tiempo Restante': slaResult.tiempoRestante,
    };
  }
}
