import { getSupabaseAdmin } from '@/lib/supabase-store';

export const SEPTEMBER_2026_RANGE = {
  start: '2026-09-01',
  end: '2026-09-30',
} as const;

export type ClaroOrderRef = {
  order_id: string;
  order_name: string;
  fecha: string;
  operador: string;
};

/**
 * Universo alineado al reporte Claro Mensual: filtro por `fecha` del conduce
 * (misma regla que getDespachoReportRows + filtro OPERADOR en report route).
 */
export async function listClaroOrdersForSeptember2026(): Promise<ClaroOrderRef[]> {
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const out: ClaroOrderRef[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('despacho_conduce_rows')
      .select('order_id, order_name, fecha, operador, retail, payload')
      .not('order_id', 'is', null)
      .gte('fecha', SEPTEMBER_2026_RANGE.start)
      .lte('fecha', SEPTEMBER_2026_RANGE.end)
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`despacho_conduce_rows: ${error.message}`);
    if (!data?.length) break;

    for (const row of data as Array<Record<string, unknown>>) {
      const op = String(row.operador || row.retail || (row.payload as { tipoIngreso?: string })?.tipoIngreso || '')
        .trim()
        .toUpperCase();
      if (op !== 'OPERADOR' && op !== 'DISTRIBUIDOR-CLARO') continue;

      const orderId = String(row.order_id ?? '').trim();
      if (!orderId) continue;

      out.push({
        order_id: orderId,
        order_name: String(row.order_name || '').trim(),
        fecha: String(row.fecha || '').slice(0, 10),
        operador: op,
      });
    }

    if (data.length < pageSize) break;
  }

  const byId = new Map<string, ClaroOrderRef>();
  for (const r of out) byId.set(r.order_id, r);
  return [...byId.values()];
}
