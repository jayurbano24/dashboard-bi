/**
 * Valida conexión directa a Orderry API v2 y compara vs snapshot en despacho_conduce_rows.
 *
 * Uso:
 *   npx tsx scripts/test-orderry-connection.ts
 *   npx tsx scripts/test-orderry-connection.ts --order-number=TCGT-543938
 *   npx tsx scripts/test-orderry-connection.ts --order-id=21857809
 */
import { loadEnv, requireEnv } from './lib/load-env';
import { OrderryClient, OrderryApiError } from '../src/lib/orderry/client';
import type { OrderryOrder } from '../src/lib/orderry/types';

const orderNumberArg = process.argv.find((a) => a.startsWith('--order-number='))?.split('=')[1];
const orderIdArg = process.argv.find((a) => a.startsWith('--order-id='))?.split('=')[1];

const DEFAULT_ORDER_NUMBER = 'TCGT-543938';

type CompareField = {
  label: string;
  live: string;
  stored: string;
  match: boolean;
};

function pickString(...values: unknown[]): string {
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (s && s !== 'N/A' && s !== '—') return s;
  }
  return '';
}

function extractLiveSnapshot(order: OrderryOrder) {
  const cf = order.custom_fields || {};
  return {
    order_id: String(order.id),
    order_number: pickString(order.number, order.name),
    status: pickString(order.status?.name),
    status_id: order.status?.id != null ? String(order.status.id) : '',
    created_at: pickString(order.created_at),
    modified_at: pickString(order.modified_at),
    done_at: pickString(order.done_at),
    closed_at: pickString(order.closed_at),
    marca: pickString(order.asset?.brand, order.brand),
    modelo: pickString(order.asset?.model, order.model, order.asset?.title),
    imei: pickString(order.asset?.uid, order.asset?.serial, order.asset?.imei, order.serial_number),
    cliente: pickString(order.client?.name, order.client?.full_name, order.contact?.name),
    falla: pickString(order.malfunction, order.description),
    color: pickString(order.asset?.color, cf['f3129228'], cf.COLOR, cf.color),
    tipo_orden: pickString(order.order_type?.name),
    grupo_dispositivo: pickString(order.asset?.group),
  };
}

function extractStoredSnapshot(payload: Record<string, unknown>, row: Record<string, unknown>) {
  return {
    order_id: pickString(row.order_id, payload.id, payload.order_id),
    order_number: pickString(row.order_name, payload.ordenNumero, payload.order_name, payload['Orden #']),
    status: pickString(payload.estado, payload['Estado'], payload.status, row.estado),
    status_id: pickString(payload.status_id, (payload.status as { id?: number } | undefined)?.id),
    created_at: pickString(payload.created_at, payload['Creado en'], payload['Creado']),
    modified_at: pickString(payload.modified_at),
    done_at: pickString(payload.done_at, payload.completado_en),
    closed_at: pickString(payload.closed_at),
    marca: pickString(payload.marca, payload.marcaDispositivo, payload['Marca del dispositivo'], row.marca),
    modelo: pickString(payload.modelo, payload.modeloDispositivo, payload['Modelo de dispositivo'], row.modelo),
    imei: pickString(payload.imei, payload.serial, row.imei, row.serie),
    cliente: pickString(payload.cliente, payload['Nombre del cliente']),
    falla: pickString(payload.falla, payload['Mal funcionamiento'], payload.malFuncionamiento),
    color: pickString(payload.COLOR, payload.color, payload['Color']),
    tipo_orden: pickString(payload.tipoOrden, payload.tipo_orden, payload['Tipo de orden']),
    grupo_dispositivo: pickString(payload['Grupo de dispositivos'], payload.grupo_dispositivo, row.grupo),
  };
}

function compareSnapshots(
  live: ReturnType<typeof extractLiveSnapshot>,
  stored: ReturnType<typeof extractStoredSnapshot>,
): CompareField[] {
  const keys = Object.keys(live) as Array<keyof typeof live>;
  return keys.map((key) => {
    const a = live[key] || '';
    const b = stored[key] || '';
    const match = a === b || (!a && !b);
    return { label: String(key), live: a || '(vacío)', stored: b || '(vacío)', match };
  });
}

async function fetchDespachoRow(
  sbUrl: string,
  sbKey: string,
  orderNumber?: string,
  orderId?: string,
): Promise<Record<string, unknown> | null> {
  const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

  if (orderId) {
    const r = await fetch(
      `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name,marca,modelo,grupo,estado,payload&order_id=eq.${orderId}&limit=1`,
      { headers },
    );
    const rows = (await r.json()) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  if (orderNumber) {
    const r = await fetch(
      `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name,marca,modelo,grupo,estado,payload&order_name=eq.${encodeURIComponent(orderNumber)}&limit=1`,
      { headers },
    );
    const rows = (await r.json()) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  return null;
}

async function main() {
  const env = requireEnv(['ORDERRY_API_KEY']);
  process.env.ORDERRY_API_KEY = env.ORDERRY_API_KEY;
  if (env.ORDERRY_API_URL) process.env.ORDERRY_API_URL = env.ORDERRY_API_URL;

  const client = OrderryClient.fromEnv(process.env);
  const orderNumber = orderNumberArg || DEFAULT_ORDER_NUMBER;

  console.log('=== Orderry API Connection Test ===\n');
  console.log(`Base URL: ${(env.ORDERRY_API_URL || 'https://api.orderry.com').replace(/\/$/, '')}`);
  console.log(`Auth: Bearer ORDERRY_API_KEY (${env.ORDERRY_API_KEY.slice(0, 6)}…)\n`);

  // 1) Catálogo de estados
  console.log('--- 1) GET /v2/orders/statuses ---');
  const statuses = await client.getOrderStatuses();
  console.log(`Total estados: ${statuses.length}\n`);
  for (const s of statuses) {
    console.log(`  [${s.id}] ${s.name}  (grupo: ${s.group?.name ?? '—'})`);
  }

  // 2) Resolver orden
  let orderId = orderIdArg;
  if (!orderId) {
    const listed = await client.listOrders({ numbers: [orderNumber], pageSize: 10 });
    const hit = listed.data.find(
      (o) => String(o.number || o.name || '').toUpperCase() === orderNumber.toUpperCase(),
    );
    if (hit?.id) orderId = String(hit.id);
  }

  if (!orderId && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const row = await fetchDespachoRow(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      orderNumber,
    );
    if (row?.order_id) orderId = String(row.order_id);
  }

  if (!orderId) {
    throw new Error(`No se pudo resolver order_id para ${orderNumber}. Pase --order-id=NUMERIC_ID`);
  }

  console.log(`\n--- 2) GET /v2/orders/${orderId} (${orderNumber}) ---`);
  const order = await client.getOrderById(orderId);
  console.log(JSON.stringify(order, null, 2));

  // 3) Comparar vs payload guardado
  console.log('\n--- 3) Comparación vs despacho_conduce_rows.payload ---');
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Supabase no configurado — omitiendo comparación con payload.');
    return;
  }

  const row = await fetchDespachoRow(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    orderNumber,
    orderId,
  );

  if (!row) {
    console.log(`No hay fila en despacho_conduce_rows para ${orderNumber} (order_id=${orderId}).`);
    return;
  }

  const payload = (row.payload || {}) as Record<string, unknown>;
  const live = extractLiveSnapshot(order);
  const stored = extractStoredSnapshot(payload, row);
  const comparison = compareSnapshots(live, stored);

  const mismatches = comparison.filter((c) => !c.match && c.live !== '(vacío)' && c.stored !== '(vacío)');
  const missingInStored = comparison.filter((c) => c.live !== '(vacío)' && c.stored === '(vacío)');
  const staleInStored = comparison.filter((c) => c.live !== c.stored && c.live !== '(vacío)' && c.stored !== '(vacío)');

  console.log('\nCampo                  | Orderry (vivo)              | Payload guardado');
  console.log('-----------------------+-----------------------------+-----------------------------');
  for (const c of comparison) {
    const flag = c.match ? ' ' : c.stored === '(vacío)' ? '!' : '≠';
    console.log(`${flag} ${c.label.padEnd(20)} | ${c.live.padEnd(27)} | ${c.stored}`);
  }

  console.log(`\nResumen: ${comparison.filter((c) => c.match).length}/${comparison.length} coinciden`);
  if (missingInStored.length) {
    console.log(`Faltantes en payload (${missingInStored.length}): ${missingInStored.map((c) => c.label).join(', ')}`);
  }
  if (staleInStored.length) {
    console.log(`Desactualizados (${staleInStored.length}): ${staleInStored.map((c) => c.label).join(', ')}`);
  }
  if (mismatches.length === 0 && missingInStored.length === 0) {
    console.log('Snapshot alineado con Orderry en vivo para los campos comparados.');
  }
}

main().catch((err) => {
  if (err instanceof OrderryApiError) {
    console.error(`\nOrderry API error (${err.status}) en ${err.path}`);
    if (err.body) console.error(err.body);
    if (err.status === 401) {
      console.error('Revisa ORDERRY_API_KEY en .env.local (Settings > API en Orderry).');
    }
  } else {
    console.error(err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
