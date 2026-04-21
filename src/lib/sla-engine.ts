import { FullOrderData } from '@/schemas/orderry';

// Función calculateSLATarget con lógica multi-dimensional solicitada
export const calculateSLATarget = (
  entityType: FullOrderData['client_type'],
  entryType: FullOrderData['entry_type'],
  locationZone: FullOrderData['zone']
): number => {
  // Entidades base: Operator = 48h, Retailer = 72h, Distributor = 96h
  let baseHours = ({ Operator: 48, Retailer: 72, Distributor: 96 } as Record<string, number>)[entityType];
  
  // OW suma 24h, los demás (IW/DOA/NC) se mantienen
  if (entryType === 'OW') baseHours += 24;
  
  // Foránea suma 24h, GAM 0h
  if (locationZone === 'FORANEA') baseHours += 24;
  
  return baseHours;
};

// Excluye dominios (sábados y domingos) y horario no laboral (08:00 a 18:00)
export const calculateWorkingMinutes = (startDate: Date, endDate: Date): number => {
  let minutes = 0;
  let current = new Date(startDate);

  while (current < endDate) {
    const day = current.getDay();
    const hour = current.getHours();

    // Solo contabilizar de Lunes (1) a Viernes (5)
    if (day !== 0 && day !== 6) {
      if (hour >= 8 && hour < 18) {
        // Encontrar final de la jornada de hoy
        const endOfDay = new Date(current);
        endOfDay.setHours(18, 0, 0, 0);

        // Limitar al endDate real o al fin del horario laboral de hoy
        const targetEnd = (endDate < endOfDay) ? endDate : endOfDay;

        // Sumar minutos en este segmento válido
        minutes += (targetEnd.getTime() - current.getTime()) / 60000;
        
        current = new Date(targetEnd);
      } else {
        // Mover `current` al siguiente bloque válido de horario laboral
        if (hour < 8) {
          current.setHours(8, 0, 0, 0);
        } else {
          current.setDate(current.getDate() + 1);
          current.setHours(8, 0, 0, 0);
        }
      }
    } else {
      // Saltar al lunes a las 08:00 si es fin de semana
      current.setDate(current.getDate() + (day === 6 ? 2 : 1));
      current.setHours(8, 0, 0, 0);
    }
  }

  return Math.max(0, minutes);
};

// Motor de TAT Segmentado en minutos reales
export const calculateSegmentedTAT = (history: FullOrderData['status_history']) => {
  // Ordenar el historial cronológicamente por timestamp
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  let tat_diagnosis = 0;
  let tat_repair = 0;
  let tat_qc = 0;

  for (let i = 0; i < sortedHistory.length - 1; i++) {
    const start = new Date(sortedHistory[i].timestamp);
    const end = new Date(sortedHistory[i+1].timestamp);
    const status = sortedHistory[i].status;
    
    // Cálculo preciso que respeta SLA real
    const minutes = calculateWorkingMinutes(start, end);

    switch(status) {
      case 'Diagnosis':
        tat_diagnosis += minutes;
        break;
      case 'Repair':
        tat_repair += minutes;
        break;
      case 'QC':
        tat_qc += minutes;
        break;
    }
  }

  return { tat_diagnosis, tat_repair, tat_qc };
};
