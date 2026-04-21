/**
 * Utilidades para interactuar con el sistema de movimientos de técnicos
 * Usar desde aplicaciones mobile, web o backend
 */

export type MovementType =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSE'
  | 'RESUME'
  | 'COMPLETED'
  | 'TRANSFER'
  | 'ON_SITE'
  | 'DIAGNOSIS'
  | 'REPAIR'
  | 'QC_CHECK'
  | 'DELIVERY'
  | 'ISSUE';

export interface TechnicianMovement {
  order_id: string;
  order_name: string;
  technician_id: string;
  technician_name: string;
  movement_type: MovementType;
  timestamp: string;
  notes?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  tenant_id: 'GT' | 'CR';
  duration_minutes?: number;
}

const API_BASE = process.env.REACT_APP_API_URL || '/api';

/**
 * Registra un movimiento de un técnico
 * @example
 * await recordMovement({
 *   order_id: '541015',
 *   order_name: 'TCGT-541015',
 *   technician_id: 'TECH-001',
 *   technician_name: 'Juan Pérez',
 *   movement_type: 'ON_SITE',
 *   timestamp: new Date().toISOString(),
 *   tenant_id: 'GT'
 * });
 */
export async function recordMovement(movement: TechnicianMovement) {
  const response = await fetch(`${API_BASE}/technician-movements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(movement),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error registrando movimiento');
  }

  return response.json();
}

/**
 * Obtiene los movimientos de un día
 * @example
 * const movements = await getMovementsByDate('2026-04-20', 'GT');
 */
export async function getMovementsByDate(date: string, tenantId?: 'GT' | 'CR') {
  const params = new URLSearchParams({ date });
  if (tenantId) params.append('tenant_id', tenantId);

  const response = await fetch(`${API_BASE}/technician-movements?${params}`);

  if (!response.ok) {
    throw new Error('Error obteniendo movimientos');
  }

  return response.json();
}

/**
 * Obtiene los movimientos de un técnico específico en un día
 * @example
 * const techMovements = await getTechnicianMovementsByDate('2026-04-20', 'TECH-001', 'GT');
 */
export async function getTechnicianMovementsByDate(
  date: string,
  technicianId: string,
  tenantId?: 'GT' | 'CR'
) {
  const params = new URLSearchParams({ date, technician_id: technicianId });
  if (tenantId) params.append('tenant_id', tenantId);

  const response = await fetch(`${API_BASE}/technician-movements?${params}`);

  if (!response.ok) {
    throw new Error('Error obteniendo movimientos del técnico');
  }

  return response.json();
}

/**
 * Obtiene el reporte diario de actividades
 * @example
 * const report = await getDailyReport('2026-04-20', 'GT');
 */
export async function getDailyReport(date: string, tenantId?: 'GT' | 'CR') {
  const params = new URLSearchParams({ date });
  if (tenantId) params.append('tenant_id', tenantId);

  const response = await fetch(`${API_BASE}/technician-movements/daily-report?${params}`);

  if (!response.ok) {
    throw new Error('Error obteniendo reporte diario');
  }

  return response.json();
}

/**
 * Helpers para registrar movimientos comunes
 */

export const Movement = {
  /**
   * Registra que el técnico llegó al sitio
   */
  async onSite(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    location?: { latitude: number; longitude: number; address?: string },
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'ON_SITE',
      timestamp: new Date().toISOString(),
      notes: 'Técnico llegó al sitio',
      location,
      tenant_id: tenantId,
    });
  },

  /**
   * Registra inicio de diagnóstico
   */
  async startDiagnosis(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    notes?: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'DIAGNOSIS',
      timestamp: new Date().toISOString(),
      notes: notes || 'Iniciando diagnóstico',
      tenant_id: tenantId,
    });
  },

  /**
   * Registra inicio de reparación
   */
  async startRepair(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    notes?: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'REPAIR',
      timestamp: new Date().toISOString(),
      notes: notes || 'Iniciando reparación',
      tenant_id: tenantId,
    });
  },

  /**
   * Registra pausa
   */
  async pause(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    durationMinutes?: number,
    notes?: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'PAUSE',
      timestamp: new Date().toISOString(),
      notes: notes || 'Pausa de trabajo',
      duration_minutes: durationMinutes,
      tenant_id: tenantId,
    });
  },

  /**
   * Registra control de calidad
   */
  async qualityCheck(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    notes?: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'QC_CHECK',
      timestamp: new Date().toISOString(),
      notes: notes || 'Control de calidad',
      tenant_id: tenantId,
    });
  },

  /**
   * Registra entrega al cliente
   */
  async delivery(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    notes?: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'DELIVERY',
      timestamp: new Date().toISOString(),
      notes: notes || 'Equipo entregado al cliente',
      tenant_id: tenantId,
    });
  },

  /**
   * Registra completación de orden
   */
  async complete(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    notes?: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'COMPLETED',
      timestamp: new Date().toISOString(),
      notes: notes || 'Orden completada',
      tenant_id: tenantId,
    });
  },

  /**
   * Registra problema/incidencia
   */
  async issue(
    orderId: string,
    orderName: string,
    technicianId: string,
    technicianName: string,
    issue: string,
    tenantId: 'GT' | 'CR' = 'GT'
  ) {
    return recordMovement({
      order_id: orderId,
      order_name: orderName,
      technician_id: technicianId,
      technician_name: technicianName,
      movement_type: 'ISSUE',
      timestamp: new Date().toISOString(),
      notes: issue,
      tenant_id: tenantId,
    });
  },
};

/**
 * Formatea información de un movimiento para display
 */
export function formatMovement(movement: any) {
  const date = new Date(movement.timestamp);

  return {
    ...movement,
    formatted_date: date.toLocaleDateString('es-CR'),
    formatted_time: date.toLocaleTimeString('es-CR'),
    formatted_datetime: date.toLocaleString('es-CR'),
  };
}

/**
 * Obtiene el nombre legible del tipo de movimiento
 */
export const MovementTypeLabels: Record<MovementType, string> = {
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En progreso',
  PAUSE: 'Pausa',
  RESUME: 'Reanudada',
  COMPLETED: 'Completada',
  TRANSFER: 'Transferencia',
  ON_SITE: 'En sitio',
  DIAGNOSIS: 'Diagnóstico',
  REPAIR: 'Reparación',
  QC_CHECK: 'Control de calidad',
  DELIVERY: 'Entrega',
  ISSUE: 'Incidencia',
};

/**
 * Obtiene color para visualizar tipo de movimiento
 */
export const MovementTypeColors: Record<MovementType, string> = {
  ASSIGNED: '#3b82f6', // azul
  IN_PROGRESS: '#f59e0b', // ambar
  PAUSE: '#6b7280', // gris
  RESUME: '#10b981', // verde
  COMPLETED: '#8b5cf6', // púrpura
  TRANSFER: '#ec4899', // rosa
  ON_SITE: '#06b6d4', // cyan
  DIAGNOSIS: '#f97316', // naranja
  REPAIR: '#ef4444', // rojo
  QC_CHECK: '#14b8a6', // teal
  DELIVERY: '#06b6d4', // cyan
  ISSUE: '#dc2626', // rojo oscuro
};
