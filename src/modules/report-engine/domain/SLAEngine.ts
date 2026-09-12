import { BusinessCalendarEngine } from './BusinessCalendarEngine';

export type EstadoSla = 'Dentro SLA' | 'Fuera SLA' | 'En curso';

export interface SLAResult {
  slaObjetivo: number;
  slaReal: number;
  diferenciaSla: number;
  horasExcedidas: number;
  estadoSla: EstadoSla;
  cumplimiento: 'SI' | 'NO' | 'PENDIENTE';
  tiempoRestante: number;
}

export class SLAEngine {
  private calendar: BusinessCalendarEngine;
  private readonly HOURS_PER_DAY = 9.8; // 49 hours per week / 5 days

  constructor(calendar: BusinessCalendarEngine) {
    this.calendar = calendar;
  }

  public getSlaObjetivo(region: string): number {
    const reg = region.trim().toUpperCase();
    if (reg === 'METRO 1' || reg === 'METRO 2' || reg === 'METRO ORIENTE' || reg === 'GAM' || reg === 'GUATEMALA') {
      return 5;
    }
    return 3; // Occidente, Sur Occidente, Norte, etc
  }

  public calculateSLA(startDate: Date | null, endDate: Date | null, region: string): SLAResult {
    const slaObjetivo = this.getSlaObjetivo(region);

    if (!startDate) {
      return {
        slaObjetivo,
        slaReal: 0,
        diferenciaSla: 0,
        horasExcedidas: 0,
        estadoSla: 'En curso',
        cumplimiento: 'PENDIENTE',
        tiempoRestante: slaObjetivo,
      };
    }

    // Sin cierre: orden abierta — no contar como Dentro SLA
    if (!endDate) {
      const now = new Date();
      const workingMinutes = this.calendar.calculateWorkingMinutes(startDate, now);
      const slaReal = Number(((workingMinutes / 60) / this.HOURS_PER_DAY).toFixed(2));
      const margen = Number((slaObjetivo - slaReal).toFixed(2));

      return {
        slaObjetivo,
        slaReal,
        diferenciaSla: margen >= 0 ? -Math.abs(margen) : Number((slaReal - slaObjetivo).toFixed(2)),
        horasExcedidas: 0,
        estadoSla: 'En curso',
        cumplimiento: 'PENDIENTE',
        tiempoRestante: margen > 0 ? margen : 0,
      };
    }

    const workingMinutes = this.calendar.calculateWorkingMinutes(startDate, endDate);
    const workingHours = workingMinutes / 60;

    const slaReal = Number((workingHours / this.HOURS_PER_DAY).toFixed(2));

    const diferenciaSla = Number((slaReal - slaObjetivo).toFixed(2));
    const isFuera = slaReal > slaObjetivo;

    return {
      slaObjetivo,
      slaReal,
      diferenciaSla: isFuera ? diferenciaSla : -Math.abs(diferenciaSla),
      horasExcedidas: isFuera ? Number((diferenciaSla * this.HOURS_PER_DAY).toFixed(2)) : 0,
      estadoSla: isFuera ? 'Fuera SLA' : 'Dentro SLA',
      cumplimiento: isFuera ? 'NO' : 'SI',
      tiempoRestante: isFuera ? 0 : Number(Math.abs(diferenciaSla).toFixed(2)),
    };
  }
}
