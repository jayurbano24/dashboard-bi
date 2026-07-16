import { ClaroReportRow, ValidationLog } from '../shared/types';

export class ValidationEngine {
  public validateRow(row: ClaroReportRow): ValidationLog {
    const issues: string[] = [];

    if (!row['IMEI']) issues.push('IMEI vacío');
    if (!row['Modelo SAP']) issues.push('Modelo SAP no existe');
    // if (!row['Código SAP']) issues.push('Código SAP no existe'); // El usuario dijo que si no existe dejar vacio

    return {
      orderId: row['Taller'] || row['Folio'],
      issues
    };
  }
}
