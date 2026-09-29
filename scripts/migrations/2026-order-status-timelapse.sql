-- Time Lapse entre estados: eventos atómicos + vista de intervalos (calculados, no persistidos).
-- Ejecutar en Supabase SQL Editor después de 2026-order-status-history.sql

-- ---------------------------------------------------------------------------
-- 1) Campos de trazabilidad por evento
-- ---------------------------------------------------------------------------
alter table public.order_status_history
  add column if not exists source_event_id text;

comment on column public.order_status_history.changed_at is
  'Instante del evento en Orderry (event_at canónico en vistas/API).';
comment on column public.order_status_history.source_event_id is
  'Id estable del evento origen (webhook id, id remoto, o hash dedupe).';

create unique index if not exists uq_order_status_history_source_event_id
  on public.order_status_history (source_event_id)
  where source_event_id is not null;

create index if not exists idx_order_status_history_order_event_at
  on public.order_status_history (order_id, changed_at asc);

-- Fuentes que no son transiciones reales (snapshot / backfill incompleto).
-- La vista de timelapse las excluye para no distorsionar intervalos.
comment on table public.order_status_history is
  'Una fila por cambio de estado. No usar created_at/modified_at/done_at/closed_at de la orden si hay filas aquí.';

-- ---------------------------------------------------------------------------
-- 2) Vista de eventos normalizados (contrato mínimo)
-- ---------------------------------------------------------------------------
create or replace view public.vw_order_status_events as
select
  osh.id,
  osh.order_id,
  osh.status_name as status,
  osh.status_id,
  osh.changed_at as event_at,
  osh.source,
  osh.source_event_id,
  osh.created_at as ingested_at
from public.order_status_history osh
where osh.status_id is not null
  and osh.status_id > 0;

-- ---------------------------------------------------------------------------
-- 3) Secuencia por orden: dedupe + colapsar mismo estado consecutivo
-- ---------------------------------------------------------------------------
create or replace view public.vw_order_status_timelapse as
with raw as (
  select
    e.order_id,
    e.status,
    e.status_id,
    e.event_at,
    e.source,
    e.source_event_id,
    e.id,
    row_number() over (
      partition by e.order_id
      order by e.event_at asc, e.id asc
    ) as seq
  from public.vw_order_status_events e
  where e.source is distinct from 'synthetic_current'
    and e.source is distinct from 'synthetic_created'
    and e.source is distinct from 'backfill_incompleto'
),
-- Mismo order_id + status_id + event_at (duplicado exacto)
deduped as (
  select distinct on (order_id, status_id, event_at)
    order_id,
    status,
    status_id,
    event_at,
    source,
    source_event_id,
    id,
    seq
  from raw
  order by order_id, status_id, event_at asc, id asc
),
ordered as (
  select
    d.*,
    lag(status_id) over (
      partition by order_id
      order by event_at asc, id asc
    ) as prev_status_id
  from deduped d
),
-- Solo transiciones cuando cambia status_id (ignora dos EN REPARACIÓN seguidos)
transitions as (
  select
    order_id,
    status,
    status_id,
    event_at,
    source,
    source_event_id,
    id
  from ordered
  where prev_status_id is null
     or prev_status_id is distinct from status_id
),
with_previous as (
  select
    t.order_id,
    lag(t.status) over w as previous_status,
    lag(t.status_id) over w as previous_status_id,
    lag(t.event_at) over w as previous_status_at,
    t.status as current_status,
    t.status_id as current_status_id,
    t.event_at as current_status_at,
    t.source,
    t.source_event_id,
    t.id as current_event_id
  from transitions t
  window w as (
    partition by t.order_id
    order by t.event_at asc, t.id asc
  )
)
select
  order_id,
  previous_status,
  previous_status_id,
  previous_status_at,
  current_status,
  current_status_id,
  current_status_at,
  source as current_source,
  source_event_id as current_source_event_id,
  current_event_id,
  greatest(
    0,
    extract(epoch from (current_status_at - previous_status_at))
  )::bigint as elapsed_seconds,
  round(
    greatest(
      0,
      extract(epoch from (current_status_at - previous_status_at)) / 3600.0
    )::numeric,
    4
  ) as elapsed_hours,
  round(
    greatest(
      0,
      extract(epoch from (current_status_at - previous_status_at)) / 86400.0
    )::numeric,
    6
  ) as elapsed_days
from with_previous
where previous_status_at is not null;

comment on view public.vw_order_status_timelapse is
  'Intervalos entre estados consecutivos distintos por orden. elapsed_* calculado; no almacenar en tabla.';

-- ---------------------------------------------------------------------------
-- 4) RPC para dashboards / API (filtro por órdenes)
-- ---------------------------------------------------------------------------
create or replace function public.get_order_status_timelapse(p_order_ids text[])
returns table (
  order_id text,
  previous_status text,
  previous_status_id integer,
  previous_status_at timestamptz,
  current_status text,
  current_status_id integer,
  current_status_at timestamptz,
  current_source text,
  current_source_event_id text,
  elapsed_seconds bigint,
  elapsed_hours numeric,
  elapsed_days numeric
)
language sql
stable
security invoker
as $$
  select
    t.order_id,
    t.previous_status,
    t.previous_status_id,
    t.previous_status_at,
    t.current_status,
    t.current_status_id,
    t.current_status_at,
    t.current_source,
    t.current_source_event_id,
    t.elapsed_seconds,
    t.elapsed_hours,
    t.elapsed_days
  from public.vw_order_status_timelapse t
  where t.order_id = any(p_order_ids)
  order by t.order_id, t.current_status_at asc;
$$;

-- ---------------------------------------------------------------------------
-- 5) Primera fecha por status_id (reportes) — solo eventos reales en historial
-- ---------------------------------------------------------------------------
create or replace function public.get_order_status_dates_by_orders(p_order_ids text[])
returns table (
  order_id text,
  status_id integer,
  status_name text,
  changed_at timestamptz
)
language sql
stable
as $$
  select distinct on (e.order_id, e.status_id)
    e.order_id,
    e.status_id,
    e.status as status_name,
    e.event_at as changed_at
  from public.vw_order_status_events e
  where e.order_id = any(p_order_ids)
    and e.source is distinct from 'synthetic_current'
    and e.source is distinct from 'synthetic_created'
    and e.source is distinct from 'backfill_incompleto'
  order by e.order_id, e.status_id, e.event_at asc;
$$;

grant select on public.vw_order_status_events to authenticated, service_role;
grant select on public.vw_order_status_timelapse to authenticated, service_role;
grant execute on function public.get_order_status_timelapse(text[]) to authenticated, service_role;
