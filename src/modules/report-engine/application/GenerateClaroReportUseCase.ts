import { RawOrderData, ClaroReportRow, ValidationLog } from '../shared/types';
import { BusinessCalendarEngine } from '../domain/BusinessCalendarEngine';
import { SLAEngine } from '../domain/SLAEngine';
import { CatalogEngine } from '../domain/CatalogEngine';
import { HomologationEngine } from '../domain/HomologationEngine';
import { ValidationEngine } from '../domain/ValidationEngine';
import { buildClaroOrigenFechas, CLARO_HISTORIAL_DATE_KEYS } from '../shared/claro-date-sources';

export class GenerateClaroReportUseCase {
  public execute(
    rows: RawOrderData[],
    historialDatesByOrder: Map<string, Record<string, string>> = new Map(),
    historialOrigenByOrder: Map<string, string> = new Map(),
  ): { report: ClaroReportRow[]; logs: ValidationLog[] } {
    const calendar = new BusinessCalendarEngine();
    const slaEngine = new SLAEngine(calendar);
    const catalog = new CatalogEngine();
    const homologation = new HomologationEngine(catalog, slaEngine);
    const validation = new ValidationEngine();

    const report: ClaroReportRow[] = [];
    const logs: ValidationLog[] = [];

    for (const row of rows) {
      const op = String(row.tipoIngreso || row.operador || '').trim().toUpperCase();
      if (op !== 'OPERADOR' && op !== 'DISTRIBUIDOR-CLARO') {
        continue;
      }

      const orderKey = row.orderId ? String(row.orderId) : String(row.orderName || '').trim();
      const histRaw = historialDatesByOrder.get(orderKey) ?? {};
      const origenHistorial = historialOrigenByOrder.get(orderKey);

      const stageDates = {
        transito: histRaw[CLARO_HISTORIAL_DATE_KEYS.envioTiendaCac] ?? '',
        reparacion: histRaw[CLARO_HISTORIAL_DATE_KEYS.reparacionCsa] ?? '',
      };

      const homologated = homologation.homologateRow(row, {
        historialDates: histRaw,
        origenFechas: buildClaroOrigenFechas(origenHistorial, stageDates),
      });

      const validationLog = validation.validateRow(homologated);

      if (validationLog.issues.length > 0) {
        logs.push(validationLog);
      }

      report.push(homologated);
    }

    return { report, logs };
  }
}
