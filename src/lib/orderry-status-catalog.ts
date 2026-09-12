import { getSupabaseAdmin } from '@/lib/supabase-store';
import { OrderryClient } from '@/lib/orderry/client';

export type OrderryStatusRecord = {
  id: number;
  name: string;
  color?: string;
  group?: {
    type?: number;
    name?: string;
  };
};

export type EstadoCatalogoRow = {
  status_id: number;
  estado: string;
  grupo: string;
  grupo_type: number | null;
  color: string | null;
};

export async function fetchOrderryStatuses(): Promise<OrderryStatusRecord[]> {
  const client = OrderryClient.fromEnv();
  return client.getOrderStatuses();
}

export function mapOrderryStatusToCatalogRow(status: OrderryStatusRecord): EstadoCatalogoRow | null {
  const statusId = Number(status.id);
  const estado = String(status.name || '').trim();
  const grupo = String(status.group?.name || '').trim();
  if (!Number.isFinite(statusId) || statusId <= 0 || !estado || !grupo) {
    return null;
  }

  return {
    status_id: statusId,
    estado,
    grupo,
    grupo_type: typeof status.group?.type === 'number' ? status.group.type : null,
    color: status.color ? String(status.color) : null,
  };
}

export async function syncEstadosCatalogoFromOrderry(): Promise<{
  fetched: number;
  upserted: number;
  skipped: number;
}> {
  const statuses = await fetchOrderryStatuses();
  const rows = statuses
    .map(mapOrderryStatusToCatalogRow)
    .filter((row): row is EstadoCatalogoRow => row !== null);

  if (rows.length === 0) {
    throw new Error('Orderry no devolvió estados válidos para sincronizar.');
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const payload = rows.map((row) => ({
    ...row,
    synced_at: now,
    updated_at: now,
  }));

  const { error } = await supabase.from('estados_catalogo').upsert(payload, { onConflict: 'status_id' });
  if (error) {
    throw new Error(`Error upsert estados_catalogo: ${error.message}`);
  }

  return {
    fetched: statuses.length,
    upserted: rows.length,
    skipped: statuses.length - rows.length,
  };
}

export async function resolveEstadoCatalogoById(statusId: number | null | undefined): Promise<EstadoCatalogoRow | null> {
  if (!Number.isFinite(statusId) || !statusId || statusId <= 0) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('estados_catalogo')
    .select('status_id, estado, grupo, grupo_type, color')
    .eq('status_id', statusId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error consultando estados_catalogo: ${error.message}`);
  }

  return data as EstadoCatalogoRow | null;
}

export async function resolveEstadoCatalogoBatch(statusIds: number[]): Promise<Map<number, EstadoCatalogoRow>> {
  const unique = [...new Set(statusIds.filter((id) => Number.isFinite(id) && id > 0))];
  const map = new Map<number, EstadoCatalogoRow>();
  if (unique.length === 0) return map;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('estados_catalogo')
    .select('status_id, estado, grupo, grupo_type, color')
    .in('status_id', unique);

  if (error) {
    throw new Error(`Error consultando estados_catalogo: ${error.message}`);
  }

  for (const row of data || []) {
    map.set(Number(row.status_id), row as EstadoCatalogoRow);
  }
  return map;
}
