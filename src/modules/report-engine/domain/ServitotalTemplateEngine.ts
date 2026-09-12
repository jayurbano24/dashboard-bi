import { SERVITOTAL_REPORT_COLUMNS, ServitotalReportColumn } from '../shared/servitotal-config';

export class ServitotalTemplateEngine {
  public static getColumns(): ServitotalReportColumn[] {
    return [...SERVITOTAL_REPORT_COLUMNS];
  }
}
