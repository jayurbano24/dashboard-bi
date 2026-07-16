// Modular Reporting Engine
// Zero external dependencies

// =====================================================================
// 1. ARQUITECTURA EXTENSIBLE - INTERFACES Y STRATEGY PATTERN (TYPESCRIPT)
// =====================================================================

export interface UnifiedReportRow {
  conduceId: string;
  fecha: string;
  doa: boolean;
  courrier: string;
  numeroGuia: string;
  precinto: string;
  origen: string;
  operador: string;
  retail: string;
  dealer: string;
  sucursal: string;
  imei: string;
  serie: string;
  orderId: number | null;
  orderName: string;
  marca: string;
  modelo: string;
  grupo: string;
  estado: string;
  despachadoPor: string;
  created_at?: string | null;
  closed_at?: string | null;
  done_at?: string | null;
  fecha_reparacion?: string | null;
  completado_en?: string | null;
  fecha_entrega?: string | null;
  falla?: string;
  garantia?: string;
  tipo_orden?: string;
  cliente?: string;
  telefono?: string;
  serviciosObras?: string;
  marcaDispositivo?: string;
  modeloDispositivo?: string;
  modeloSap?: string;
  canalIngreso?: string;
  tipoIngreso?: string;
  fechaEnvioTienda?: string;
  motivoNoAplica?: string;
  tecnico?: string;
  justificacionTiempo?: string;
}

export interface ReportStrategy {
  name: string;
  transform(rows: UnifiedReportRow[], agencyDirectory: Record<string, string>): Record<string, any>[];
}

// ─── ESTRATEGIA: PLANTILLA CLARO MENSUAL ───────────────────────────────
export class ClaroMonthlyStrategy implements ReportStrategy {
  name = 'PLANTILLA_CLARO_MENSUAL';

  transform(rows: UnifiedReportRow[], agencyDirectory: Record<string, string>): Record<string, any>[] {
    const filteredRows = rows.filter(row => {
      const op = (row.tipoIngreso || row.operador || '').trim().toUpperCase();
      return op === 'OPERADOR' || op === 'DISTRIBUIDOR-CLARO';
    });

    return filteredRows.map((row) => {
      const getStr = (val: any): string => (val !== undefined && val !== null ? String(val).trim() : '');

      const canalIngreso = getStr(row.canalIngreso || row.origen || row.dealer || row.sucursal);
      const tipoIngreso = getStr(row.tipoIngreso || row.operador || row.retail || row.dealer);
      
      // Oficina Ventas: primeros 4 caracteres en mayúscula de CANAL DE INGRESO
      const oficinaVentas = canalIngreso ? canalIngreso.slice(0, 4).toUpperCase() : '';

      // Extraer prefijo de agencia (ej. G203 de G203-METRONORTE)
      const prefixMatch = canalIngreso.match(/^([A-Za-z0-9]+)/);
      const agencyPrefix = prefixMatch ? prefixMatch[1].toUpperCase() : '';
      
      const dept = agencyDirectory[agencyPrefix] ? agencyDirectory[agencyPrefix].trim().toLowerCase() : '';

      // Clasificación GAM / NO GAM
      let gamNoGam = 'NO GAM';
      if (dept === 'guatemala') {
        gamNoGam = 'GAM';
      } else if (dept) {
        gamNoGam = 'NO GAM';
      } else {
        // Fallback por defecto según prefijo
        const gamPrefixes = [
          'G201', 'G203', 'G204', 'G205', 'G206', 'G207', 'G208', 'G210', 
          'G211', 'G213', 'G214', 'G215', 'G216', 'G217', 'G218', 'G219', 
          'G21A', 'G21E', 'G220', 'G221', 'G222', 'G223', 'G225', 'G226', 
          'G227', 'G228', 'G229', 'G230', 'G231', 'G232', 'G233', 'G271'
        ];
        gamNoGam = gamPrefixes.includes(agencyPrefix) ? 'GAM' : 'NO GAM';
      }

      // Estatus
      const estadoOriginal = getStr(row.estado).toUpperCase();
      const estatus = ['ENTREGADO', 'CLOSED', 'CERRADO'].includes(estadoOriginal) ? 'REPARADO' : getStr(row.estado);

      // Tipo Garantía
      const tipoOrden = getStr(row.tipo_orden || row.grupo);
      const garantiaVal = getStr(row.garantia).toUpperCase();
      let tiposDeGarantia = '';
      if (tipoOrden.toUpperCase().includes('REPARACION IW') || garantiaVal === 'SI' || garantiaVal === 'IW') {
        tiposDeGarantia = 'GARANTIA FABRICANTE';
      } else if (garantiaVal === 'NO' || garantiaVal === 'OW') {
        tiposDeGarantia = 'FUERA DE GARANTIA';
      }

      // Procesamiento de Fechas
      const parseDate = (val: any): Date | null => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const createdDate = parseDate(row.created_at || row.fecha);
      // done_at = cuando el técnico marcó como reparada (EN CONTROL DE CALIDAD)
      const doneDate = parseDate(row.done_at || row.fecha_reparacion || null);
      // closed_at = cuando se cerró/envió al CAC
      const closedDate = parseDate(row.closed_at ?? null);
      const deliveredDate = parseDate(row.fecha_entrega ?? null);

      const formatDate = (d: Date | null): string => {
        if (!d) return '';
        try {
          const pad = (n: number) => String(n).padStart(2, '0');
          const yyyy = d.getFullYear();
          const MM = pad(d.getMonth() + 1);
          const dd = pad(d.getDate());
          const hh = pad(d.getHours());
          const mm = pad(d.getMinutes());
          return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
        } catch {
          return d.toISOString().slice(0, 16).replace('T', ' ');
        }
      };

      // Días transcurridos entre Creación y Cierre (Días hábiles exactos basados en horario laboral)
      let daysDiff: number | string = '';
      if (closedDate && createdDate && closedDate >= createdDate) {
        const HOLIDAYS = new Set([
          // 2024
          '2024-01-01', '2024-03-28', '2024-03-29', '2024-03-30', '2024-05-01', '2024-06-30',
          '2024-09-15', '2024-10-20', '2024-11-01', '2024-12-24', '2024-12-25', '2024-12-31',
          // 2025
          '2025-01-01', '2025-04-17', '2025-04-18', '2025-04-19', '2025-05-01', '2025-06-30',
          '2025-09-15', '2025-10-20', '2025-11-01', '2025-12-24', '2025-12-25', '2025-12-31',
          // 2026
          '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-05-01', '2026-06-30',
          '2026-09-15', '2026-10-20', '2026-11-01', '2026-12-24', '2026-12-25', '2026-12-31'
        ]);

        let totalWorkingMs = 0;
        let current = new Date(createdDate.getTime());
        const endMs = closedDate.getTime();

        while (current.getTime() < endMs) {
          // Convertimos la hora actual a la zona horaria de Guatemala (UTC-6)
          const localCurrent = new Date(current.getTime() - (6 * 60 * 60 * 1000));
          const year = localCurrent.getUTCFullYear();
          const month = localCurrent.getUTCMonth();
          const date = localCurrent.getUTCDate();
          const day = localCurrent.getUTCDay(); // 0 = Dom, 6 = Sáb
          const dateStr = localCurrent.toISOString().split('T')[0];

          // Medianoche local de Guatemala expresada en UTC (06:00 UTC)
          const gtMidnightUtc = Date.UTC(year, month, date, 6, 0, 0, 0);

          let startHour = 0;
          let endHour = 0;

          // Lunes a Jueves: 8:00 a 18:00
          if (day >= 1 && day <= 4 && !HOLIDAYS.has(dateStr)) {
            startHour = 8;
            endHour = 18;
          } 
          // Viernes: 8:00 a 17:00
          else if (day === 5 && !HOLIDAYS.has(dateStr)) {
            startHour = 8;
            endHour = 17;
          }

          if (startHour > 0 && endHour > 0) {
            const shiftStartMs = gtMidnightUtc + (startHour * 60 * 60 * 1000);
            const shiftEndMs = gtMidnightUtc + (endHour * 60 * 60 * 1000);

            const actualStartMs = Math.max(current.getTime(), shiftStartMs);
            const actualEndMs = Math.min(endMs, shiftEndMs);

            if (actualEndMs > actualStartMs) {
              totalWorkingMs += (actualEndMs - actualStartMs);
            }
          }

          // Avanzar al inicio del próximo día (Guatemala time)
          current = new Date(gtMidnightUtc + 24 * 60 * 60 * 1000);
        }

        const totalHours = totalWorkingMs / (1000 * 60 * 60);
        
        // Dividimos entre 10 porque el día laboral estándar es de 10 horas (Lunes-Jueves).
        // Así, 10 horas trabajadas = 1.0 días.
        daysDiff = Number((totalHours / 10).toFixed(2));
      }

      return {
        'Orden': getStr(row.orderName || row.conduceId),
        'Oficina Ventas': oficinaVentas,
        'CAC o Canal': canalIngreso,
        'Tipo Cliente': tipoIngreso,
        'GAM / NO GAM': gamNoGam,
        'Imei': getStr(row.imei || row.serie),
        'Falla': getStr(row.falla),
        'Garantia': getStr(row.garantia) || 'IW',
        'Estatus': estatus,
        'TIPOS DE GARANTIA': tiposDeGarantia,
        'Fecha Recepción Taller CSA': formatDate(createdDate),
        'Fecha de reparación en CSA': formatDate(doneDate),
        'Fecha de Envio CAC': formatDate(closedDate),
        'Fecha entrega a CAC': formatDate(deliveredDate),
        'Cliente': getStr(row.cliente),
        'Teléfono': getStr(row.telefono),
        'Marca': getStr(row.marcaDispositivo || row.marca),
        'Modelo': getStr(row.modeloDispositivo || row.modelo),
        'Modelo Sap': getStr(row.modeloSap),
        'Falla reportada por Tienda': getStr(row.falla || row.serviciosObras),
        'Reparacion realizada por taller CSA': getStr(row.serviciosObras),
        'Fecha de creacion de Folio': formatDate(createdDate),
        'Fecha de envio por parte tienda CAC': getStr(row.fechaEnvioTienda),
        'motivo por que no aplica': getStr(row.motivoNoAplica),
        'Técnico': getStr(row.tecnico),
        'No. Guia de envio a Cac': getStr(row.numeroGuia),
        'Justificación por que se salio del tiempo': getStr(row.justificacionTiempo),
        'Unnamed: 12': daysDiff,
      };
    });
  }
}

// ─── ESTRATEGIA: MASTER INTERNA (TCW_MASTER) ─────────────────────────
export class TcwMasterStrategy implements ReportStrategy {
  name = 'TCW_MASTER';

  transform(rows: UnifiedReportRow[]): Record<string, any>[] {
    return rows.map((row) => ({
      'No. Conduce': row.conduceId,
      'Fecha/Hora': row.fecha,
      'Despachado Por': row.despachadoPor,
      'DOA': row.doa ? 'SÍ' : 'NO',
      'Courier': row.courrier,
      'Guía Courier': row.numeroGuia,
      'Precinto': row.precinto,
      'Origen': row.origen,
      'Operador': row.operador,
      'Retail': row.retail,
      'Dealer': row.dealer,
      'Sucursal': row.sucursal,
      'IMEI': row.imei,
      'Serie': row.serie,
      'ID Orden': row.orderId,
      'Nombre Orden': row.orderName,
      'Marca': row.marca,
      'Modelo': row.modelo,
      'Grupo': row.grupo,
      'Estado': row.estado,
    }));
  }
}

// ─── ESTRATEGIA: CLAIMS DTI ─────────────────────────────────────────
export class ClaimsDtiStrategy implements ReportStrategy {
  name = 'CLAIMS_DTI';

  transform(rows: UnifiedReportRow[]): Record<string, any>[] {
    return rows.map((row) => ({
      'ID Reclamo': row.orderId || row.conduceId,
      'Fecha': row.fecha,
      'Cliente': row.operador || row.retail || row.dealer,
      'IMEI': row.imei,
      'Serie': row.serie,
      'Marca': row.marca,
      'Modelo': row.modelo,
      'Falla Reportada': row.falla,
      'Garantía': row.garantia,
      'Estado': row.estado,
      'Técnico': row.tecnico,
      'Guía Courier': row.numeroGuia
    }));
  }
}

// ─── REPORT FACTORY ──────────────────────────────────────────────────
export class ReportFactory {
  private static strategies: Record<string, ReportStrategy> = {};

  static register(strategy: ReportStrategy) {
    this.strategies[strategy.name] = strategy;
  }

  static getStrategy(name: string): ReportStrategy {
    const strategy = this.strategies[name];
    if (!strategy) {
      throw new Error(`Report strategy '${name}' is not registered.`);
    }
    return strategy;
  }
}

// Registro automático de las estrategias
ReportFactory.register(new ClaroMonthlyStrategy());
ReportFactory.register(new TcwMasterStrategy());
ReportFactory.register(new ClaimsDtiStrategy());

// =====================================================================
// 2. ENRUTAMIENTO GEOGRÁFICO DINÁMICO & ENGINE PRINCIPAL (TYPESCRIPT)
// =====================================================================

export class ReportingEngine {
  private agencyDirectory: Record<string, string> = {};

  constructor(customDirectory?: Record<string, string>) {
    if (customDirectory) {
      this.agencyDirectory = customDirectory;
    } else {
      this.loadFallbackDirectory();
    }
  }

  private loadFallbackDirectory() {
    // Directorio geográfico basado en el listado de agencias de Claro en GT
    const cacsGuatemala = [
      'G201', 'G202', 'G203', 'G204', 'G205', 'G206', 'G207', 'G208', 'G209', 'G210',
      'G211', 'G212', 'G213', 'G214', 'G215', 'G216', 'G217', 'G218', 'G21A', 'G220',
      'G222', 'G223', 'G225', 'G226', 'G227', 'G228', 'G229', 'G250', 'G26G', 'G270',
      'G271', 'G278', 'G279', 'G27M'
    ];
    cacsGuatemala.forEach((code) => {
      this.agencyDirectory[code] = 'Guatemala';
    });

    const cacsForaneos: Record<string, string> = {
      'G254': 'Sacatepéquez', 'G256': 'Chimaltenango', 'G255': 'Sacatepéquez', 'G26J': 'Santa Rosa',
      'G26A': 'El Progreso', 'G262': 'Jalapa', 'G26B': 'El Progreso',
      'G234': 'Jutiapa', 'G231': 'Jutiapa',
      'G264': 'Chiquimula', 'G267': 'Zacapa', 'G268': 'Petén', 'G277': 'Izabal',
      'G275': 'Alta Verapaz', 'G272': 'Alta Verapaz', 'G276': 'Izabal', 'G273': 'Baja Verapaz',
      'G269': 'Zacapa', 'G241': 'Quetzaltenango', 'G238': 'Quetzaltenango', 'G240': 'San Marcos',
      'G239': 'Quetzaltenango', 'G23Q': 'Quetzaltenango', 'G26H': 'Quetzaltenango', 'G244': 'San Marcos',
      'G246': 'San Marcos', 'G245': 'San Marcos', 'G242': 'Huehuetenango', 'G257': 'Sololá',
      'G274': 'Quiché', 'G277': 'Totonicapán', 'G252': 'Escuintla', 'G253': 'Escuintla',
      'G258': 'Escuintla', 'G248': 'Suchitepéquez', 'G247': 'Suchitepéquez', 'G251': 'Retalhuleu',
      'G249': 'Suchitepéquez'
    };

    Object.assign(this.agencyDirectory, cacsForaneos);
    // Asegurar que las agencias de Guatemala tengan precedencia absoluta
    cacsGuatemala.forEach((code) => {
      this.agencyDirectory[code] = 'Guatemala';
    });
  }

  process(
    rows: UnifiedReportRow[],
    strategyName: string,
    regionFilter: 'TODOS' | 'GAM' | 'NO GAM' = 'TODOS'
  ): Record<string, any>[] {
    // 1. Filtrar geográficamente
    let filteredRows = [...rows];
    if (regionFilter !== 'TODOS') {
      filteredRows = rows.filter((row) => {
        const canalIngreso = String(row.origen || row.dealer || row.sucursal || '').trim().toUpperCase();
        const prefixMatch = canalIngreso.match(/^([A-Za-z0-9]+)/);
        const prefix = prefixMatch ? prefixMatch[1] : '';
        
        const dept = (this.agencyDirectory[prefix] || '').trim().toLowerCase();
        const isGam = dept === 'guatemala';

        return regionFilter === 'GAM' ? isGam : !isGam;
      });
    }

    // 2. Ejecutar la estrategia
    const strategy = ReportFactory.getStrategy(strategyName);
    return strategy.transform(filteredRows, this.agencyDirectory);
  }
}
