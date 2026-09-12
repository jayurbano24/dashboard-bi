-- Catálogo normalizado de estados Orderry + historial de cambios por orden

create table if not exists public.orderry_statuses (
  id integer primary key,
  name text not null,
  group_name text not null,
  group_type integer,
  color text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orderry_statuses_name
  on public.orderry_statuses (name);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  status_id integer not null,
  status_name text not null,
  changed_at timestamptz not null,
  source text not null default 'backfill',
  created_at timestamptz not null default now(),
  constraint uq_order_status_history_event unique (order_id, status_id, changed_at)
);

create index if not exists idx_order_status_history_order
  on public.order_status_history (order_id, changed_at);

create index if not exists idx_order_status_history_status
  on public.order_status_history (status_id);

-- Migrar catálogo legado si existe
insert into public.orderry_statuses (id, name, group_name, group_type, color, synced_at, updated_at)
select
  ec.status_id,
  ec.estado,
  ec.grupo,
  ec.grupo_type,
  ec.color,
  coalesce(ec.synced_at, now()),
  coalesce(ec.updated_at, now())
from public.estados_catalogo ec
on conflict (id) do update set
  name = excluded.name,
  group_name = excluded.group_name,
  group_type = excluded.group_type,
  color = excluded.color,
  synced_at = excluded.synced_at,
  updated_at = excluded.updated_at;

-- Migrar historial legado
insert into public.order_status_history (order_id, status_id, status_name, changed_at, source)
select
  h.orden_id,
  coalesce(h.status_id_nuevo, 0),
  coalesce(nullif(trim(h.estado_nuevo), ''), os.name, 'DESCONOCIDO'),
  h.fecha_hora_cambio,
  coalesce(h.origen, 'historial_movimientos')
from public.historial_movimientos h
left join public.orderry_statuses os on os.id = h.status_id_nuevo
where h.status_id_nuevo is not null
on conflict (order_id, status_id, changed_at) do nothing;

-- Agregación para reportes (pivot mínimo por grupo / estado clave)
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
  select distinct on (osh.order_id, osh.status_id)
    osh.order_id,
    osh.status_id,
    osh.status_name,
    osh.changed_at
  from public.order_status_history osh
  where osh.order_id = any(p_order_ids)
  order by osh.order_id, osh.status_id, osh.changed_at asc;
$$;
