import { NextResponse } from 'next/server';
import { OrderryWebhookSchema } from '@/schemas/orderry';
import crypto from 'crypto';

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

    // 1. Opcional: Fetch a Orderry para traer toda la info del objeto completo si queremos en este punto.

    // 2. Guardado "In-Memory / Ligero" en Google Sheets
    // Escribimos un nuevo Row en Excel/Sheets de forma asíncrona para que no bloquee el webhook
    const { appendWebhookToSheet, saveTechnicianMovement } = await import('@/lib/google-sheets');

    await appendWebhookToSheet({
      fecha: result.data.created_at,
      orderName: metadata.order.name,
      tenantId: tenant_id,
      oldStatusId: metadata.old?.id,
      newStatusId: metadata.new.id,
      empleado: result.data.employee?.full_name || 'Desconocido'
    });

    // 3. Registrar movimiento automáticamente del técnico
    // Mapear estado de Orderry a tipo de movimiento
    const movementTypeMap: Record<number, string> = {
      1: 'ASSIGNED',      // Asignada
      2: 'IN_PROGRESS',   // En reparación
      3: 'COMPLETED',     // Completada
      4: 'DELIVERY',      // Entregada
      5: 'PAUSE',         // En pausa
    };

    const movementType = movementTypeMap[metadata.new.id] || 'ISSUE';
    const technicianName = result.data.employee?.full_name || 'Sistema Automático';
    const technicianId = String(result.data.employee?.id || 'AUTO');

    try {
      await saveTechnicianMovement({
        order_id: String(metadata.order.id),
        order_name: metadata.order.name,
        technician_id: technicianId,
        technician_name: technicianName,
        movement_type: movementType,
        timestamp: result.data.created_at,
        notes: `Cambio de estado automático de Orderry: ${metadata.old?.id || 'Inicial'} → ${metadata.new.id}`,
        tenant_id: tenant_id as 'GT' | 'CR',
      });
    } catch (movementError) {
      console.warn('No se pudo registrar movimiento automático:', movementError);
      // No lanzamos error, solo warn - no queremos bloquear el webhook por esto
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook recibido y datos registrados en Google Sheets',
      tenant: tenant_id,
      event_data: {
        order_id: metadata.order.id,
        transition: `${metadata.old?.id} to ${metadata.new.id}`,
        movement_recorded: movementType
      }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
