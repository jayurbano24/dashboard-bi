import { RawOrderData, ClaroReportRow, ValidationLog } from '../shared/types';
import { BusinessCalendarEngine } from '../domain/BusinessCalendarEngine';
import { SLAEngine } from '../domain/SLAEngine';
import { CatalogEngine } from '../domain/CatalogEngine';
import { HomologationEngine } from '../domain/HomologationEngine';
import { ValidationEngine } from '../domain/ValidationEngine';

export class GenerateClaroReportUseCase {
  public execute(rows: RawOrderData[]): { report: ClaroReportRow[], logs: ValidationLog[] } {
    const calendar = new BusinessCalendarEngine(); // TODO: Inyectar feriados
    const slaEngine = new SLAEngine(calendar);
    const catalog = new CatalogEngine();
    const homologation = new HomologationEngine(catalog, slaEngine);
    const validation = new ValidationEngine();

    const report: ClaroReportRow[] = [];
    const logs: ValidationLog[] = [];

    for (const row of rows) {
      // Filtrar estrictamente por Tipo de Cliente
      const op = String(row.tipoIngreso || row.operador || '').trim().toUpperCase();
      if (op !== 'OPERADOR' && op !== 'DISTRIBUIDOR-CLARO') {
        continue;
      }

      const homologated = homologation.homologateRow(row);
      const validationLog = validation.validateRow(homologated);
      
      if (validationLog.issues.length > 0) {
        logs.push(validationLog);
      }
      
      report.push(homologated);
    }

    return { report, logs };
  }
}
