# FASE 1 — Diagnóstico técnico: historial Orderry → TC-ERP

Fecha de referencia: recuperación timeline septiembre 2026. **Sin cambios a lógica del reporte Claro en esta fase.**

## Criterio de período (septiembre 2026) — reporte Claro hoy

| Aspecto | Comportamiento actual |
|--------|------------------------|
| UI Despacho | `reportStartDate` / `reportEndDate` → query params `startDate`, `endDate` |
| API | `GET /api/despacho/report?template=PLANTILLA_CLARO_MENSUAL&startDate=&endDate=` |
| Filtro filas | `getDespachoReportRows` filtra por columna **`fecha`** de `despacho_conduce_rows` (fecha de conduce), **no** por `created_at` |
| Excepción | Plantillas PRONET/Servitotal filtran por `created_at` de la orden |
| Claro candidatas | `tipoIngreso` / `operador` ∈ `OPERADOR`, `DISTRIBUIDOR-CLARO` |

**Implicación para el scraper de sept 2026:** el universo de órdenes debe alinearse al reporte Claro usando **`fecha` entre 2026-09-01 y 2026-09-30** (más filtro operador), con opción documentada de ampliar por `modified_at` / `closed_at` en columnas sync si negocio lo confirma.

Helper: `src/integrations/orderry-history/september-2026-scope.ts`.

---

## Matriz archivo → responsabilidad

| Archivo / ruta | Responsabilidad actual | Reutilizar | Modificar | Intacto |
|----------------|------------------------|------------|-----------|---------|
| `src/lib/orderry/client.ts` | REST API Bearer (`ORDERRY_API_KEY`), list/get orders, items | Cliente base, rate limit | No para timeline (404 history) | Sí |
| `src/lib/orderry/config.ts` | URL + API key | Sí | Añadir vars web opcionales en doc | Sí |
| `src/lib/orderry-order-snapshot.ts` | Enriquecimiento reporte (GET order, items) | No en scraper | **Reporte:** no tocar en fase scraper | Scraper no usa |
| `src/lib/order-status-history.ts` | `buildOrderStatusSourceEventId`, tipos timelapse | `buildOrderStatusSourceEventId` | — | Sí |
| `src/lib/supabase-store.ts` | `insertOrderStatusHistory`, `getHistorialEstadoFechasPorOrdenes`, timelapse RPC | `insertOrderStatusHistory` | Solo si hace falta índice/batch insert | Lógica reporte intacta |
| `src/app/api/webhooks/route.ts` | Order.Status.Changed → `historial_movimientos` + `order_status_history` | Patrón de inserción | — | Sí |
| `scripts/run-backfill.ts` | Webhooks DB + API events + **synthetic** | Dedupe, catálogo estados | No usar synthetic para scraper sept | Synthetic sigue para otros flujos |
| `scripts/backfill-historial.ts` | 1 fila incompleta por orden | — | **No** usar para timeline | — |
| `src/app/api/despacho/historial-backfill/route.ts` | Igual backfill incompleto (25/lote) | — | Deprecar para timeline; no borrar aún | — |
| `scripts/migrations/2026-order-status-history.sql` | Tabla + unique (order_id, status_id, changed_at) | Esquema | — | Sí |
| `scripts/migrations/2026-order-status-timelapse.sql` | Vistas + RPC timelapse | Vistas post-ingesta | — | Sí |
| `modules/report-engine/*` | Homologación Claro, fechas desde historial agregado | Todo el pipeline reporte | **Intacto** en fase scraper | Sí |
| `src/app/api/despacho/report/route.ts` | Orquesta Claro + historial maps | Flujo | **Intacto** | Sí |
| `historial_movimientos` | Espejo legacy + webhooks | Mirror opcional post-scraper | Scraper escribe **solo** `order_status_history` primero | No borrar filas |

---

## Limitación API (confirmada en repo)

```text
GET /v2/orders/{id}/history → 404
GET /v2/orders/{id}/events  → 404
GET /v2/orders/{id}/items   → 200 (repuestos; NO es timeline de estados)
```

---

## Pipeline objetivo (scraper)

```text
Orderry UI / internal API (FASE 2–3)
        ↓
src/integrations/orderry-history/   (parse + normalize)
        ↓
insertOrderStatusHistory (source = orderry_timeline_scraper | orderry_internal_api)
        ↓
order_status_history
        ↓
vw_order_status_timelapse / getHistorialEstadoFechasPorOrdenes (existente)
        ↓
Reporte Claro (sin cambios en fase 1)
```

## Reglas del scraper (SSOT)

- Solo eventos **reales** con status + timestamp + id estable si existe.
- **Prohibido:** inferir desde `created_at`, `done_at`, `closed_at`, repuestos, o columnas del reporte.
- **No** sobrescribir filas webhook/backfill existentes (upsert con conflict ignore / mismo unique key).

---

## Próximos pasos (FASE 2+)

1. `npx tsx scripts/discover-orderry-history.ts TCGT-548123`
2. Documentar endpoint interno en `docs/diagnostics/orderry-timeline-api.md` (sanitizado).
3. Implementar `OrderryHistoryClient` + job sept 2026 batch.
4. `npx tsx scripts/import-orderry-timeline-sept-2026.ts --dry-run`
