import { BusinessCalendarEngine } from './BusinessCalendarEngine';

export interface SLAResult {
  slaObjetivo: number;
  slaReal: number;
  diferenciaSla: number;
  horasExcedidas: number;
  estadoSla: 'Dentro SLA' | 'Fuera SLA';
  cumplimiento: 'SI' | 'NO';
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

    if (!startDate || !endDate) {
      return {
        slaObjetivo,
        slaReal: 0,
        diferenciaSla: 0,
        horasExcedidas: 0,
        estadoSla: 'Dentro SLA', // Por defecto si no hay fin
        cumplimiento: 'NO',
        tiempoRestante: slaObjetivo,
      };
    }

    const workingMinutes = this.calendar.calculateWorkingMinutes(startDate, endDate);
    const workingHours = workingMinutes / 60;
    
    // SLA Real en días
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
      tiempoRestante: isFuera ? 0 : Number(Math.abs(diferenciaSla).toFixed(2))
    };
  }
}
