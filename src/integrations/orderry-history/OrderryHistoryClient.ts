import { createOrderryClientFromEnv } from '@/lib/orderry/client';
import type { OrderryTimelineFetchResult } from './types';
import { parseOrderryInternalTimelineResponse } from './parse-internal-api';
import { fetchOrderryObjectEventsWeb } from './fetch-event-log-web';

export class OrderryHistoryClient {
  /** Resuelve id interno Orderry (21864649) desde label TCGT-… o id numérico. */
  async resolveInternalOrderId(orderRef: string): Promise<number> {
    const ref = orderRef.trim();
    if (/^\d+$/.test(ref)) return Number.parseInt(ref, 10);

    const client = createOrderryClientFromEnv(process.env);
    const { data } = await client.listOrders({ numbers: [ref], pageSize: 10 });
    const upper = ref.toUpperCase();
    const match =
      data.find(
        (o) =>
          String(o.number || '').toUpperCase() === upper || String(o.name || '').toUpperCase() === upper,
      ) ?? data[0];
    if (!match?.id) {
      throw new Error(`Orden no encontrada en API v2: ${ref}`);
    }
    return match.id;
  }

  async fetchTimelineForOrder(
    orderId: string,
    orderNumber: string,
    requestContext?: import('playwright').APIRequestContext,
    statusNameById?: Map<number, string>,
  ): Promise<OrderryTimelineFetchResult> {
    const warnings: string[] = [];
    let internalId: number;
    try {
      internalId = await this.resolveInternalOrderId(orderId || orderNumber);
    } catch (err) {
      return {
        order_id: orderId,
        order_number: orderNumber,
        events: [],
        fetch_method: 'none',
        warnings: [err instanceof Error ? err.message : String(err)],
      };
    }

    const orderIdStr = String(internalId);

    let namesById = statusNameById;
    if (!namesById || namesById.size === 0) {
      try {
        const api = createOrderryClientFromEnv(process.env);
        const statuses = await api.getOrderStatuses();
        namesById = new Map(statuses.map((s) => [s.id, s.name]));
      } catch {
        warnings.push('No se cargó catálogo /v2/orders/statuses; nombres desde metadata o id.');
      }
    }

    let raw: unknown;
    try {
      raw = await fetchOrderryObjectEventsWeb({ objectId: internalId, requestContext });
    } catch (err) {
      return {
        order_id: orderIdStr,
        order_number: orderNumber,
        events: [],
        fetch_method: 'none',
        warnings: [err instanceof Error ? err.message : String(err), ...warnings],
      };
    }

    const events = parseOrderryInternalTimelineResponse(orderIdStr, raw, namesById);
    if (Array.isArray(raw) && raw.length > 0 && events.length === 0) {
      warnings.push(
        `Event log devolvió ${raw.length} ítems pero ninguno con metadata.status (solo se persisten cambios de estado).`,
      );
    }

    return {
      order_id: orderIdStr,
      order_number: orderNumber,
      events,
      fetch_method: events.length > 0 ? 'internal_api' : 'none',
      warnings,
    };
  }
}
