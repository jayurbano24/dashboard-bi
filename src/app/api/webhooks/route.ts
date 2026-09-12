import { NextResponse } from 'next/server';
import { OrderryWebhookSchema } from '@/schemas/orderry';
import crypto from 'crypto';
import {
  appendWebhookEvent,
  insertHistorialMovimiento,
  saveTechnicianMovement,
} from '@/lib/supabase-store';
import {
  resolveEstadoCatalogoBatch,
  syncEstadosCatalogoFromOrderry,
} from '@/lib/orderry-status-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WEBHOOK_SECRET = process.env.ORDERRY_WEBHOOK_SECRET || 'secret_orderry_key_123';

const verifyHMACSignature = (payload: string, signatureHeader: string | null) => {
  if (!signatureHeader) return false;
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch (e) {
    return false;
  }
};

// Utilidad para extraer país desde el nombre de la orden
const extractTenantFromOrderName = (orderName: string) => {
  // Ej: "TCGT-541015" -> GT
  if (orderName.includes('GT-')) return 'GT';
  if (orderName.includes('CR-')) return 'CR';
  return 'UNKNOWN';
};

/** GET = verificación en navegador. Orderry envía POST con el evento. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/webhooks',
    methods: ['GET', 'POST'],
    message:
      'Webhook activo. Orderry debe usar POST con evento Order.Status.Changed. ' +
      'Un 405 en GET antiguo era normal si solo existía POST; este GET confirma que la ruta existe.',
  });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // Validación de Firma - Orderry envía la firma en el payload pero usualmente también como Header?
    // Tu payload mostraba 'x-signature' adjunto en el JSON. Podemos validar directamente ahí:
    const signature = payload['x-signature'] || req.headers.get('x-orderry-signature');

    /* if (!verifyHMACSignature(rawBody, signature)) {
      // return NextResponse.json({ error: 'Unauthorized: Firma HMAC inválida' }, { status: 401 });
    } */ // (Descomentado en Producción tras cuadrar el Secret exacto)

    // Validación Zod (Firewall de Datos para el Webhook real)
    const result = OrderryWebhookSchema.safeParse(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Bad Request: Fallo en esquema Zod', details: result.error.errors },
        { status: 400 }
      );
    }

    const { metadata } = result.data;
    const tenant_id = extractTenantFromOrderName(metadata.order.name);

    console.log(`Evento ${result.data.event_name} recibido para la orden ${metadata.order.id} del país ${tenant_id}`);
    console.log(`Transición de estado: ${metadata.old?.id ?? 'Ninguno'} -> ${metadata.new.id}`);

    await appendWebhookEvent({
      event_name: result.data.event_name,
      order_id: String(metadata.order.id),
      order_name: metadata.order.name,
      tenant_id,
      old_status_id: metadata.old?.id,
      new_status_id: metadata.new.id,
      employee_name: result.data.employee?.full_name,
      created_at: result.data.created_at,
      raw_payload: payload,
    });

    let historialRecorded = false;

    if (/order\.status\.changed/i.test(result.data.event_name)) {
      const statusIds = [metadata.old?.id, metadata.new.id].filter(
        (id): id is number => typeof id === 'number' && id > 0,
      );
      let catalog = await resolveEstadoCatalogoBatch(statusIds);

      if (statusIds.some((id) => !catalog.has(id))) {
        console.warn(
          `[historial_movimientos] status_id sin catálogo (${statusIds.join(', ')}). Ejecuta sync-orderry-statuses.`,
        );
        try {
          await syncEstadosCatalogoFromOrderry();
          catalog = await resolveEstadoCatalogoBatch(statusIds);
        } catch (syncErr) {
          console.warn('[historial_movimientos] Auto-sync de estados falló:', syncErr);
        }
      }

      const oldResolved = metadata.old?.id ? catalog.get(metadata.old.id) : null;
      const newResolved = catalog.get(metadata.new.id);

      if (!newResolved) {
        console.error(
          `[historial_movimientos] status_id ${metadata.new.id} sin nombre en estados_catalogo. ` +
            'Corra npm run orderry:sync-statuses.',
        );
      }

      try {
        await insertHistorialMovimiento({
          orden_id: String(metadata.order.id),
          fecha_hora_cambio: result.data.created_at,
          estado_anterior: oldResolved?.estado ?? null,
          estado_nuevo: newResolved?.estado ?? null,
          grupo_nuevo: newResolved?.grupo ?? null,
          status_id_anterior: metadata.old?.id ?? null,
          status_id_nuevo: metadata.new.id,
          origen: 'webhook',
          usuario: result.data.employee?.full_name ?? null,
          payload_crudo: payload as Record<string, unknown>,
        });
        historialRecorded = true;
        console.log(
          `[historial_movimientos] OK orden ${metadata.order.id}: ` +
            `${oldResolved?.estado ?? '—'} → ${newResolved?.estado ?? metadata.new.id}`,
        );
      } catch (historialError) {
        const msg = historialError instanceof Error ? historialError.message : String(historialError);
        console.error(`[historial_movimientos] FALLO orden ${metadata.order.id}:`, msg);
      }
    }

    const movementTypeMap: Record<number, string> = {
      1: 'ASSIGNED',
      2: 'IN_PROGRESS',
      3: 'COMPLETED',
      4: 'DELIVERY',
      5: 'PAUSE',
    };

    const movementType = movementTypeMap[metadata.new.id] || 'ISSUE';
    const technicianName = result.data.employee?.full_name || 'Sistema Automático';
    const technicianId = String(result.data.employee?.id || 'AUTO');

    if (tenant_id === 'GT' || tenant_id === 'CR') {
      try {
        await saveTechnicianMovement({
          order_id: String(metadata.order.id),
          order_name: metadata.order.name,
          technician_id: technicianId,
          technician_name: technicianName,
          movement_type: movementType,
          timestamp: result.data.created_at,
          notes: `Cambio de estado automático de Orderry: ${metadata.old?.id || 'Inicial'} -> ${metadata.new.id}`,
          tenant_id,
        });
      } catch (movementError) {
        console.warn('No se pudo registrar movimiento automático:', movementError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook recibido',
      tenant: tenant_id,
      event_data: {
        order_id: metadata.order.id,
        transition: `${metadata.old?.id} to ${metadata.new.id}`,
        movement_recorded: movementType,
        historial_recorded: historialRecorded,
      }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
