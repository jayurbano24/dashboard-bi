-- Paso 3: catálogo vivo, columnas live en despacho, estado de sync

create table if not exists public.estados_catalogo (
  status_id integer primary key,
  estado text not null,
  grupo text,
  grupo_type integer,
  color text,
  synced_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.historial_movimientos (
  id uuid primary key default gen_random_uuid(),
  orden_id text not null,
  fecha_hora_cambio timestamptz not null,
  estado_anterior text,
  estado_nuevo text,
  grupo_nuevo text,
  status_id_anterior integer,
  status_id_nuevo integer,
  origen text not null default 'webhook',
  usuario text,
  payload_crudo jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_historial_orden_fecha
  on public.historial_movimientos (orden_id, fecha_hora_cambio);

alter table public.despacho_conduce_rows
  add column if not exists status_id integer,
  add column if not exists status_live text,
  add column if not exists modified_at timestamptz,
  add column if not exists done_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists color text,
  add column if not exists last_synced_at timestamptz;

create table if not exists public.sync_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_despacho_order_id
  on public.despacho_conduce_rows (order_id)
  where order_id is not null;
