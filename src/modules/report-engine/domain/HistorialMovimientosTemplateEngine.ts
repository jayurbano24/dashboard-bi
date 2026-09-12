import { getAllHistorialReportColumnLabels } from '../shared/historial-types';

export class HistorialMovimientosTemplateEngine {
  public static getColumns(): string[] {
    return getAllHistorialReportColumnLabels();
  }
}
