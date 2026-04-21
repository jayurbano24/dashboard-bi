import { NextResponse } from 'next/server';
import { CreateTechnicianMovementSchema } from '@/schemas/technician-movement';
import { saveTechnicianMovement, getTechnicianMovementsByDate, getTechnicianDailySummary } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/technician-movements
 * Registra un nuevo movimiento de un técnico en una orden
 *
 * Body:
 * {
 *   "order_id": "541015",
 *   "order_name": "TCGT-541015",
 *   "technician_id": "TECH-001",
 *   "technician_name": "Juan Pérez",
 *   "movement_type": "IN_PROGRESS",
 *   "timestamp": "2026-04-20T14:30:00Z",
 *   "notes": "Iniciando diagnóstico",
 *   "tenant_id": "GT",
 *   "location": { "latitude": 9.9281, "longitude": -84.0907 }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validar datos con schema
    const validated = CreateTechnicianMovementSchema.parse(body);

    // Guardar en Google Sheets
    await saveTechnicianMovement({
      order_id: validated.order_id,
      order_name: validated.order_name,
      technician_id: validated.technician_id,
      technician_name: validated.technician_name,
      movement_type: validated.movement_type,
      timestamp: validated.timestamp,
      notes: validated.notes,
      latitude: validated.location?.latitude,
      longitude: validated.location?.longitude,
      address: validated.location?.address,
      tenant_id: validated.tenant_id,
      duration_minutes: validated.duration_minutes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Movimiento registrado exitosamente',
        data: validated,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registrando movimiento:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error al registrar movimiento',
      },
      { status: error?.status || 400 }
    );
  }
}

/**
 * GET /api/technician-movements?date=2026-04-20&tenant_id=GT
 * Obtiene todos los movimientos de un día
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const tenantId = searchParams.get('tenant_id') as 'GT' | 'CR' | undefined;
    const technicianId = searchParams.get('technician_id');

    if (!date) {
      return NextResponse.json(
        { error: 'Parámetro "date" es requerido (formato: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Si solicita resumen de un técnico específico
    if (technicianId) {
      const summary = await getTechnicianDailySummary(date, technicianId, tenantId);

      if (!summary) {
        return NextResponse.json(
          {
            date,
            technician_id: technicianId,
            message: 'No hay movimientos registrados para este técnico en esta fecha',
            movements: [],
          },
          { status: 200 }
        );
      }

      return NextResponse.json(summary);
    }

    // Obtener todos los movimientos del día
    const movements = await getTechnicianMovementsByDate(date, tenantId);

    // Agrupar por técnico
    const byTechnician = new Map<
      string,
      {
        technician_id: string;
        technician_name: string;
        movements: typeof movements;
        total_movements: number;
        orders_count: number;
      }
    >();

    movements.forEach((movement) => {
      const key = movement.technician_id;
      if (!byTechnician.has(key)) {
        byTechnician.set(key, {
          technician_id: movement.technician_id,
          technician_name: movement.technician_name,
          movements: [],
          total_movements: 0,
          orders_count: 0,
        });
      }

      const tech = byTechnician.get(key)!;
      tech.movements.push(movement);
      tech.total_movements += 1;
      tech.orders_count = new Set(tech.movements.map((m) => m.order_id)).size;
    });

    return NextResponse.json({
      date,
      tenant_id: tenantId || 'ALL',
      total_movements: movements.length,
      technicians_count: byTechnician.size,
      technicians: Array.from(byTechnician.values()).sort(
        (a, b) => b.total_movements - a.total_movements
      ),
    });
  } catch (error: any) {
    console.error('Error obteniendo movimientos:', error);

    return NextResponse.json(
      {
        error: error?.message || 'Error al obtener movimientos',
      },
      { status: 500 }
    );
  }
}
