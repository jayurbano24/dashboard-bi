import { PRONET_REPORT_COLUMNS, PronetReportColumn } from '../shared/pronet-config';

export class PronetTemplateEngine {
  public static getColumns(): PronetReportColumn[] {
    return [...PRONET_REPORT_COLUMNS];
  }
}
