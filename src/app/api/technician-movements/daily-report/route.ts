import { NextResponse } from 'next/server';
import { getTechnicianMovementsByDate, getTechnicianDailySummary } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/technician-movements/daily-report?date=2026-04-20&tenant_id=GT
 * Obtiene reporte diario de actividades de técnicos
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const tenantId = searchParams.get('tenant_id') as 'GT' | 'CR' | undefined;

    if (!date) {
      return NextResponse.json(
        { error: 'Parámetro "date" es requerido (formato: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Obtener todos los movimientos del día
    const movements = await getTechnicianMovementsByDate(date, tenantId);

    if (!movements.length) {
      return NextResponse.json({
        date,
        tenant_id: tenantId || 'ALL',
        total_movements: 0,
        unique_technicians: 0,
        unique_orders: 0,
        summary: [],
        movement_types_distribution: {},
      });
    }

    // Construir resumen por técnico
    const technicianMap = new Map<
      string,
      {
        technician_id: string;
        technician_name: string;
        tenant_id: string;
        total_movements: number;
        orders: Set<string>;
        movement_types: Map<string, number>;
        completed_orders: number;
        in_progress_orders: number;
        total_active_hours: number;
        first_movement: string;
        last_movement: string;
      }
    >();

    // Agrupar movimientos por técnico
    movements.forEach((movement) => {
      const key = movement.technician_id;

      if (!technicianMap.has(key)) {
        technicianMap.set(key, {
          technician_id: movement.technician_id,
          technician_name: movement.technician_name,
          tenant_id: movement.tenant_id,
          total_movements: 0,
          orders: new Set(),
          movement_types: new Map(),
          completed_orders: 0,
          in_progress_orders: 0,
          total_active_hours: 0,
          first_movement: movement.timestamp,
          last_movement: movement.timestamp,
        });
      }

      const tech = technicianMap.get(key)!;
      tech.total_movements += 1;
      tech.orders.add(movement.order_id);

      // Contar tipos de movimiento
      const typeCount = tech.movement_types.get(movement.movement_type) || 0;
      tech.movement_types.set(movement.movement_type, typeCount + 1);

      // Contar órdenes completadas
      if (movement.movement_type === 'COMPLETED') {
        tech.completed_orders += 1;
      }

      // Contar en progreso
      if (
        ['IN_PROGRESS', 'ON_SITE', 'DIAGNOSIS', 'REPAIR'].includes(
          movement.movement_type
        )
      ) {
        tech.in_progress_orders += 1;
      }

      // Sumar horas activas
      if (movement.duration_minutes) {
        tech.total_active_hours += Number(movement.duration_minutes) / 60;
      }

      // Actualizar timestamps
      if (new Date(movement.timestamp) < new Date(tech.first_movement)) {
        tech.first_movement = movement.timestamp;
      }
      if (new Date(movement.timestamp) > new Date(tech.last_movement)) {
        tech.last_movement = movement.timestamp;
      }
    });

    // Construir resumen
    const summary = Array.from(technicianMap.values()).map((tech) => ({
      technician_id: tech.technician_id,
      technician_name: tech.technician_name,
      tenant_id: tech.tenant_id,
      total_movements: tech.total_movements,
      total_orders: tech.orders.size,
      completed_orders: tech.completed_orders,
      in_progress_orders: tech.in_progress_orders,
      total_active_hours: Number(tech.total_active_hours.toFixed(2)),
      movement_types: Object.fromEntries(tech.movement_types),
      first_movement: tech.first_movement,
      last_movement: tech.last_movement,
      work_duration_hours: Number(
        (
          (new Date(tech.last_movement).getTime() -
            new Date(tech.first_movement).getTime()) /
          (1000 * 60 * 60)
        ).toFixed(2)
      ),
    }));

    // Distribuición de tipos de movimiento global
    const movementTypesDistribution: Record<string, number> = {};
    movements.forEach((movement) => {
      movementTypesDistribution[movement.movement_type] =
        (movementTypesDistribution[movement.movement_type] || 0) + 1;
    });

    // Estadísticas generales
    const totalOrdersPerDay = new Set(movements.map((m) => m.order_id)).size;
    const completedOrdersPerDay = movements.filter(
      (m) => m.movement_type === 'COMPLETED'
    ).length;
    const completionRate = totalOrdersPerDay
      ? Math.round((completedOrdersPerDay / totalOrdersPerDay) * 100)
      : 0;

    return NextResponse.json({
      date,
      tenant_id: tenantId || 'ALL',
      total_movements: movements.length,
      unique_technicians: technicianMap.size,
      unique_orders: totalOrdersPerDay,
      completed_orders_today: completedOrdersPerDay,
      completion_rate: `${completionRate}%`,
      movement_types_distribution: movementTypesDistribution,
      summary: summary.sort((a, b) => b.total_movements - a.total_movements),
    });
  } catch (error: any) {
    console.error('Error generando reporte diario:', error);

    return NextResponse.json(
      {
        error: error?.message || 'Error al generar reporte',
      },
      { status: 500 }
    );
  }
}
