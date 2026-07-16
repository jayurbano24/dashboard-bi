export class BusinessCalendarEngine {
  private holidays: Set<string>;

  constructor(holidays: string[] = []) {
    this.holidays = new Set(holidays);
  }

  /**
   * Calcula los minutos hábiles entre dos fechas.
   * Lunes a Jueves: 08:00 - 18:00
   * Viernes: 08:00 - 17:00
   */
  public calculateWorkingMinutes(startDate: Date, endDate: Date): number {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 0;
    }
    
    if (startDate > endDate) {
      return 0; // Fechas invertidas o inválidas
    }

    let totalWorkingMinutes = 0;
    let current = new Date(startDate.getTime());
    const endMs = endDate.getTime();

    while (current.getTime() < endMs) {
      // Usamos UTC-6 (Guatemala) para evitar problemas de timezone de servidor
      const localCurrent = new Date(current.getTime() - (6 * 60 * 60 * 1000));
      const year = localCurrent.getUTCFullYear();
      const month = localCurrent.getUTCMonth();
      const date = localCurrent.getUTCDate();
      const day = localCurrent.getUTCDay(); // 0 = Dom, 6 = Sáb
      
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${year}-${pad(month + 1)}-${pad(date)}`;

      // Medianoche local de Guatemala expresada en UTC absoluto
      const gtMidnightUtc = Date.UTC(year, month, date, 6, 0, 0, 0);

      let startHour = 0;
      let endHour = 0;

      // Si no es feriado
      if (!this.holidays.has(dateStr)) {
        if (day >= 1 && day <= 4) { // Lunes a Jueves
          startHour = 8;
          endHour = 18;
        } else if (day === 5) { // Viernes
          startHour = 8;
          endHour = 17;
        }
      }

      if (startHour > 0 && endHour > 0) {
        const shiftStartMs = gtMidnightUtc + (startHour * 60 * 60 * 1000);
        const shiftEndMs = gtMidnightUtc + (endHour * 60 * 60 * 1000);

        const actualStartMs = Math.max(current.getTime(), shiftStartMs);
        const actualEndMs = Math.min(endMs, shiftEndMs);

        if (actualEndMs > actualStartMs) {
          totalWorkingMinutes += (actualEndMs - actualStartMs) / (1000 * 60);
        }
      }

      // Avanzar al inicio del próximo día (Guatemala time)
      current = new Date(gtMidnightUtc + 24 * 60 * 60 * 1000);
    }

    return totalWorkingMinutes;
  }
}
