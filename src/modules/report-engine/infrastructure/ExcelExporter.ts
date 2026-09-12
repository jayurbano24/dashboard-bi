import * as XLSX from 'xlsx';
import { ClaroReportRow } from '../shared/types';
import { ReportTemplateEngine } from '../domain/ReportTemplateEngine';

export class ExcelExporter {
  public exportRowsToBuffer<T extends Record<string, unknown>>(
    rows: T[],
    columns: string[],
    sheetName = 'ORIGINAL',
  ): Buffer {
    const data = rows.map((row) => {
      const orderedRow: Record<string, unknown> = {};
      for (const col of columns) {
        orderedRow[col] = row[col] ?? '';
      }
      return orderedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  public exportToBuffer(rows: ClaroReportRow[]): Buffer {
    const columns = ReportTemplateEngine.getColumns();
    
    // Mapear los datos garantizando el orden estricto de columnas de la plantilla
    const data = rows.map(row => {
      const orderedRow: any = {};
      for (const col of columns) {
        orderedRow[col] = row[col];
      }
      return orderedRow;
    });

    return this.exportRowsToBuffer(data, columns as string[], 'ORIGINAL');
  }

  public exportToCsvString(rows: ClaroReportRow[]): string {
    const columns = ReportTemplateEngine.getColumns();
    
    const data = rows.map(row => {
      const orderedRow: any = {};
      for (const col of columns) {
        orderedRow[col] = row[col];
      }
      return orderedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: columns as string[] });
    // \ufeff para BOM (UTF-8) en excel csv
    return '\ufeff' + XLSX.utils.sheet_to_csv(worksheet);
  }
}
