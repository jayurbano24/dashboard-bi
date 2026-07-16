import { ClaroReportRow } from '../shared/types';

export class ReportTemplateEngine {
  public static getColumns(): (keyof ClaroReportRow)[] {
    return [
      'Taller',
      'Oficina Ventas',
      'CAC o Canal',
      'Tipo Cliente',
      'Cliente',
      'Teléfono',
      'Fecha creación Folio',
      'Fecha envío por parte tienda CAC',
      'Fecha Recepción Taller CSA',
      'Fecha reparación CSA',
      'Fecha Envío CAC',
      'Fecha entrega CAC',
      'SLA',
      'GAM / NO GAM',
      'Folio',
      'IMEI',
      'Código SAP',
      'Fecha Activación',
      'Marca',
      'Modelo SAP',
      'Fecha Facturación',
      'Falla',
      'Garantía',
      'Motivo por que no aplica',
      'Usuario o Técnico',
      'No Guía envío CAC',
      'No Guía recibió Taller',
      'Falla reportada por Tienda',
      'Reparación realizada',
      'Estatus',
      'Justificación fuera SLA',
      'Tipos de Garantía',
      'SLA Objetivo',
      'SLA Real',
      'Diferencia SLA',
      'Horas Excedidas',
      'Estado SLA',
      'Cumplimiento',
      'Tiempo Restante'
    ];
  }
}
