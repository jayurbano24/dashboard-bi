/** Extracción de campos snapshot desde GET /v2/orders/{id} */

const FIELD_ID: Record<string, string> = {
  'TIPO DE INGRESO': 'f3129962',
  'CANAL DE INGRESO': 'f3129964',
  COLOR: 'f3129228',
  GARANTIA: 'f3129961',
  'FECHA DE VENTA POP': 'f3129227',
  'FECHA DE VENTA -POP': 'f3129227',
  'IN COURIER': 'f3151083',
  'FOLIO PDV': 'f3130204',
  POBLACION: 'f3156821',
  'DIRECCION SUCURSAL': 'f3156821',
};

export type OrderryOrderSnapshot = {
  orderName: string;
  created_at: string | null;
  closed_at: string | null;
  done_at: string | null;
  cliente: string;
  telefono: string;
  tipoOrden: string;
  estado: string;
  grupoDispositivo: string;
  marca: string;
  modelo: string;
  serie: string;
  falla: string;
  serviciosObras: string;
  garantia: string;
  canalIngreso: string;
  tipoIngreso: string;
  color: string;
  folioPdv: string;
  fechaVentaPop: string;
  inCourier: string;
  statusId: number | null;
  grupoEstado: string;
  sucursalBranch: string;
  modified_at: string | null;
  engineerNotes: string;
  poblacion: string;
};

export function getOrderryCustomField(
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!obj) return '';
  for (const key of keys) {
    const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
    const id = FIELD_ID[kUp];
    if (id && obj[id] != null && String(obj[id]).trim() !== '') return String(obj[id]).trim();
  }
  for (const key of keys) {
    const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
    const found = Object.entries(obj).find(
      ([k]) => k.toUpperCase().replace(/\s+/g, ' ').trim() === kUp,
    );
    if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim();
  }
  return '';
}

const STATUSES_AFTER_REPAIR = [
  'EN CONTROL DE CALIDAD',
  'REPARADO',
  'PARA DEVOLVER',
  'PARA DEVOLUCION',
  'PARA DEVOLUCIÓN',
  'LISTO PARA RETIRAR',
  'ENTREGADO',
  'CERRADO',
  'TERMINADO',
  'COMPLETADO',
  'NO REPARADO',
  'SIN REPARACION',
  'IRREPARABLE',
];

export function extractOrderryOrderSnapshot(match: Record<string, unknown>): OrderryOrderSnapshot {
  const cf = match.custom_fields as Record<string, unknown> | undefined;
  const asset = match.asset as Record<string, unknown> | undefined;
  const client = match.client as Record<string, unknown> | undefined;
  const status = match.status as { id?: number; name?: string; group?: { name?: string } } | undefined;

  const rawStatusName = String(status?.name ?? '').toUpperCase();
  const isAfterRepair = STATUSES_AFTER_REPAIR.some((s) => rawStatusName.includes(s.replace('Ó', 'O')));
  const done_at =
    (match.done_at as string | null | undefined) ??
    (isAfterRepair ? ((match.modified_at as string | null | undefined) ?? null) : null);

  const cliente =
    getOrderryCustomField(cf, 'Nombre', 'nombre') ||
    String(client?.name || client?.full_name || '').trim();

  return {
    orderName: String(match.number ?? match.name ?? match.id ?? ''),
    created_at: (match.created_at as string | null | undefined) ?? null,
    closed_at: (match.closed_at as string | null | undefined) ?? null,
    done_at: done_at ?? null,
    cliente,
    telefono: String(client?.phone || '').trim(),
    tipoOrden: String((match.order_type as { name?: string } | undefined)?.name || ''),
    estado: String(status?.name || ''),
    grupoDispositivo: String(asset?.group || match.kindof_good || '').trim(),
    marca: String(asset?.brand || '').trim(),
    modelo: String(asset?.model || asset?.title || '').trim(),
    serie: String(asset?.uid || asset?.serial || asset?.imei || '').trim(),
    falla: String(
      match.malfunction || getOrderryCustomField(cf, 'Mal funcionamiento', 'Falla') || '',
    ).trim(),
    serviciosObras: String(
      ((match.works as Array<{ title?: string; name?: string }> | undefined)
        ?.map((w) => w.title || w.name)
        .filter(Boolean)
        .join('; ') ??
        '') ||
        (typeof match.works === 'string' ? match.works : '') ||
        '',
    ).trim(),
    garantia: getOrderryCustomField(cf, 'GARANTIA', 'garantia') || '',
    canalIngreso: getOrderryCustomField(cf, 'CANAL DE INGRESO', 'Canal de Ingreso') || '',
    tipoIngreso: getOrderryCustomField(cf, 'TIPO DE INGRESO', 'Tipo de Ingreso') || '',
    color:
      getOrderryCustomField(cf, 'COLOR', 'color', 'Color') || String(asset?.color || '').trim(),
    folioPdv: getOrderryCustomField(cf, 'FOLIO PDV', 'FOLIO PDV *') || '',
    fechaVentaPop:
      getOrderryCustomField(cf, 'FECHA DE VENTA -POP', 'FECHA DE VENTA -POP *', 'FECHA DE VENTA POP') ||
      '',
    inCourier: getOrderryCustomField(cf, 'IN COURIER') || '',
    statusId: typeof status?.id === 'number' ? status.id : null,
    grupoEstado: String(status?.group?.name || '').trim(),
    sucursalBranch: String((match.branch as { name?: string } | undefined)?.name || '').trim(),
    modified_at: (match.modified_at as string | null | undefined) ?? null,
    engineerNotes: String(match.engineer_notes || '').trim(),
    poblacion: getOrderryCustomField(cf, 'POBLACION', 'DIRECCION SUCURSAL'),
  };
}

/** Convierte orden Orderry API → fila del motor de reportes. */
export function orderryOrderToRawOrderData(match: Record<string, unknown>): Record<string, unknown> {
  const snap = extractOrderryOrderSnapshot(match);
  const cf = match.custom_fields as Record<string, unknown> | undefined;
  const asset = match.asset as Record<string, unknown> | undefined;
  const client = match.client as Record<string, unknown> | undefined;
  const status = match.status as { id?: number; name?: string; group?: { name?: string } } | undefined;
  const branch = match.branch as { name?: string } | undefined;
  const created = snap.created_at || null;

  return {
    conduceId: '',
    orderId: typeof match.id === 'number' ? match.id : Number(match.id) || null,
    orderName: snap.orderName,
    fecha: created ? String(created).slice(0, 10) : '',
    created_at: created,
    closed_at: snap.closed_at,
    done_at: snap.done_at,
    fecha_reparacion: snap.done_at,
    fecha_entrega: snap.closed_at,
    operador: '',
    retail: snap.tipoIngreso,
    dealer: '',
    sucursal: snap.sucursalBranch,
    origen: snap.canalIngreso,
    canalIngreso: snap.canalIngreso,
    tipoIngreso: snap.tipoIngreso,
    imei: snap.serie,
    serie: snap.serie,
    marca: snap.marca,
    marcaDispositivo: snap.marca,
    modelo: snap.modelo,
    modeloDispositivo: snap.modelo,
    modeloSap: '',
    falla: snap.falla,
    serviciosObras: snap.serviciosObras,
    garantia: snap.garantia,
    tipo_orden: snap.tipoOrden,
    estado: snap.estado,
    status_live: snap.estado,
    cliente: snap.cliente,
    telefono: snap.telefono,
    motivoNoAplica: '',
    tecnico: '',
    numeroGuia: snap.inCourier,
    justificacionTiempo: '',
    fechaEnvioTienda: '',
    folioPdv: snap.folioPdv,
    inCourier: snap.inCourier,
    grupoEstado: snap.grupoEstado,
    modified_at: snap.modified_at,
    rawRecord: {
      custom_fields: cf,
      branch,
      client,
      asset,
      kindof_good: match.kindof_good ?? asset?.group,
      status,
      'CANAL DE INGRESO': snap.canalIngreso,
      'TIPO DE INGRESO': snap.tipoIngreso,
      'IN COURIER': snap.inCourier,
      inCourier: snap.inCourier,
      'FOLIO PDV': snap.folioPdv,
      folioPdv: snap.folioPdv,
      'Mal funcionamiento': snap.falla,
      'Estado': snap.estado,
      estado: snap.estado,
      created_at: created,
      closed_at: snap.closed_at,
      done_at: snap.done_at,
      engineer_notes: match.engineer_notes,
      works: match.works,
      POBLACION: getOrderryCustomField(cf, 'POBLACION', 'DIRECCION SUCURSAL'),
    },
  };
}

export async function fetchOrderryOrderSnapshot(
  orderId: string | number,
): Promise<OrderryOrderSnapshot | null> {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  if (!apiKey || !orderId) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const match = (await res.json()) as Record<string, unknown>;
    if (!match?.id) return null;
    return extractOrderryOrderSnapshot(match);
  } catch {
    return null;
  }
}

export function mergeOrderrySnapshotIntoReportRow(
  row: Record<string, unknown>,
  snap: OrderryOrderSnapshot,
): Record<string, unknown> {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const pick = (current: unknown, next: string) => {
    const c = String(current ?? '').trim();
    if (c && c !== 'N/A' && c !== '—') return c;
    return next || c;
  };

  const snapIsClosed = Boolean(String(snap.closed_at ?? '').trim());
  const pickStatus = (current: unknown) =>
    snapIsClosed && snap.estado ? snap.estado : pick(current, snap.estado);

  return {
    ...row,
    orderName: pick(row.orderName, snap.orderName),
    created_at: row.created_at || snap.created_at,
    closed_at: row.closed_at || snap.closed_at,
    done_at: row.done_at || snap.done_at,
    fecha_reparacion: row.fecha_reparacion || snap.done_at,
    cliente: pick(row.cliente, snap.cliente),
    telefono: pick(row.telefono, snap.telefono),
    tipo_orden: pick(row.tipo_orden, snap.tipoOrden),
    estado: pickStatus(row.estado),
    status_live: pickStatus(row.status_live),
    statusId: snap.statusId ?? (row as Record<string, unknown>).statusId,
    modified_at: (row as Record<string, unknown>).modified_at || snap.modified_at,
    garantia: pick(row.garantia, snap.garantia),
    canalIngreso: pick(row.canalIngreso, snap.canalIngreso),
    tipoIngreso: pick(row.tipoIngreso, snap.tipoIngreso),
    falla: pick(row.falla, snap.falla),
    serviciosObras: pick(row.serviciosObras, snap.serviciosObras),
    grupoEstado: pick(row.grupoEstado, snap.grupoEstado),
    sucursal: pick(row.sucursal, snap.sucursalBranch),
    folioPdv: pick(row.folioPdv, snap.folioPdv),
    fechaFacturacion: pick(row.fechaFacturacion, snap.fechaVentaPop),
    rawRecord: {
      ...raw,
      'Creado en': raw['Creado en'] || snap.created_at,
      'Estado': pickStatus(raw['Estado']),
      'Nombre del cliente': pick(raw['Nombre del cliente'], snap.cliente),
      'Grupo de dispositivos': pick(raw['Grupo de dispositivos'], snap.grupoDispositivo),
      'Marca del dispositivo': pick(raw['Marca del dispositivo'], snap.marca),
      'Modelo de dispositivo': pick(raw['Modelo de dispositivo'], snap.modelo),
      'FECHA DE VENTA -POP': pick(raw['FECHA DE VENTA -POP'], snap.fechaVentaPop),
      COLOR: pick(raw.COLOR, snap.color),
      color: pick(raw.color, snap.color),
      'FOLIO PDV': pick(raw['FOLIO PDV'], snap.folioPdv),
      folioPdv: snap.folioPdv || raw.folioPdv,
      'IN COURIER': pick(raw['IN COURIER'], snap.inCourier),
      inCourier: snap.inCourier || raw.inCourier,
      created_at: raw.created_at || snap.created_at,
      closed_at: raw.closed_at || snap.closed_at,
      done_at: raw.done_at || snap.done_at,
      modified_at: raw.modified_at || snap.modified_at,
      status:
        raw.status ||
        (snap.statusId
          ? {
              id: snap.statusId,
              name: snap.estado,
              group: snap.grupoEstado ? { name: snap.grupoEstado } : undefined,
            }
          : undefined),
      branch: raw.branch || (snap.sucursalBranch ? { name: snap.sucursalBranch } : undefined),
      engineer_notes: pick(raw.engineer_notes, snap.engineerNotes),
      POBLACION: pick(raw.POBLACION, snap.poblacion),
    },
  };
}

export function reportRowNeedsOrderryEnrich(row: Record<string, unknown>): boolean {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const empty = (v: unknown) => !String(v ?? '').trim() || String(v).trim() === 'N/A';
  return (
    empty(row.done_at) ||
    empty(row.closed_at) ||
    empty(raw['FECHA DE VENTA -POP']) && empty(row.fechaFacturacion) ||
    empty(raw['FOLIO PDV']) && empty(row.folioPdv) ||
    empty(raw['IN COURIER']) && empty(raw.inCourier) ||
    empty(raw.COLOR) && empty(raw.color)
  );
}

export async function enrichReportRowsFromOrderry<T extends Record<string, unknown>>(
  rows: T[],
  options?: { maxFetches?: number; concurrency?: number; allWithOrderId?: boolean },
): Promise<{ rows: T[]; enriched: number; skipped: number }> {
  const maxFetches = options?.maxFetches ?? 120;
  const concurrency = options?.concurrency ?? 12;

  const targets = (options?.allWithOrderId
    ? rows.filter((r) => r.orderId)
    : rows.filter((r) => reportRowNeedsOrderryEnrich(r))
  ).slice(0, maxFetches);

  let enriched = 0;
  let idx = 0;

  async function worker() {
    while (idx < targets.length) {
      const i = idx++;
      const row = targets[i];
      const orderId = row.orderId ? String(row.orderId) : '';
      if (!orderId) continue;

      const snap = await fetchOrderryOrderSnapshot(orderId);
      if (!snap) continue;

      const merged = mergeOrderrySnapshotIntoReportRow(row, snap);
      Object.assign(row, merged);
      enriched += 1;

      await new Promise((r) => setTimeout(r, 60));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));

  return { rows, enriched, skipped: rows.length - targets.length };
}
