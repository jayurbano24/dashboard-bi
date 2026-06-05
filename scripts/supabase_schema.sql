-- Supabase schema for Dashboard-BI migration (Google Sheets -> Supabase)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- 0) Conduce registry (unique and non-repeatable correlatives)
create table if not exists public.despacho_conduces (
  id uuid primary key default gen_random_uuid(),
  conduce_id text not null,
  fecha timestamptz not null,
  doa boolean not null default false,
  courrier text not null default '',
  numero_guia text not null default '',
  precinto text not null default '',
  origen text not null default '',
  operador text not null default '',
  retail text not null default '',
  dealer text not null default '',
  sucursal text not null default '',
  created_at timestamptz not null default now(),
  constraint uq_despacho_conduces_conduce_id unique (conduce_id)
);

create index if not exists idx_despacho_conduces_fecha
  on public.despacho_conduces (fecha desc);

-- Backfill existing conduce IDs (safe to run repeatedly)
insert into public.despacho_conduces (
  conduce_id, fecha, doa, courrier, numero_guia, precinto, origen, operador, retail, dealer, sucursal
)
select distinct on (conduce_id)
  conduce_id,
  fecha,
  doa,
  courrier,
  numero_guia,
  precinto,
  origen,
  operador,
  retail,
  dealer,
  sucursal
from public.despacho_conduce_rows
where coalesce(conduce_id, '') <> ''
order by conduce_id, created_at asc
on conflict (conduce_id) do nothing;

-- 1) Despacho: persisted rows per conduce
create table if not exists public.despacho_conduce_rows (
  id uuid primary key default gen_random_uuid(),
  conduce_id text not null,
  fecha timestamptz not null,
  doa boolean not null default false,
  courrier text not null default '',
  numero_guia text not null default '',
  precinto text not null default '',
  origen text not null default '',
  operador text not null default '',
  retail text not null default '',
  dealer text not null default '',
  sucursal text not null default '',
  imei text not null default '',
  serie text not null default '',
  order_id text,
  order_name text not null default '',
  marca text not null default '',
  modelo text not null default '',
  grupo text not null default '',
  estado text not null default '',
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_despacho_conduce_rows_conduce_id
  on public.despacho_conduce_rows (conduce_id);

create index if not exists idx_despacho_conduce_rows_fecha
  on public.despacho_conduce_rows (fecha desc);

create index if not exists idx_despacho_conduce_rows_imei
  on public.despacho_conduce_rows (imei);

-- 2) Despacho agencies directory
create table if not exists public.despacho_agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_despacho_agencies_name unique (name)
);

create index if not exists idx_despacho_agencies_active_name
  on public.despacho_agencies (active, name);

-- 3) Technician movements
create table if not exists public.technician_movements (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  order_name text not null,
  technician_id text not null,
  technician_name text not null,
  movement_type text not null,
  "timestamp" timestamptz not null,
  movement_date date not null,
  notes text,
  latitude double precision,
  longitude double precision,
  address text,
  tenant_id text not null check (tenant_id in ('GT', 'CR')),
  duration_minutes integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_technician_movements_movement_date
  on public.technician_movements (movement_date);

create index if not exists idx_technician_movements_tenant_date
  on public.technician_movements (tenant_id, movement_date);

create index if not exists idx_technician_movements_technician_date
  on public.technician_movements (technician_id, movement_date);

create index if not exists idx_technician_movements_timestamp
  on public.technician_movements ("timestamp" desc);

-- 4) Orderry webhooks audit/events
create table if not exists public.orderry_webhooks (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  order_id text not null,
  order_name text not null,
  tenant_id text not null,
  old_status_id integer,
  new_status_id integer,
  employee_name text,
  webhook_at timestamptz not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orderry_webhooks_order_id
  on public.orderry_webhooks (order_id);

create index if not exists idx_orderry_webhooks_webhook_at
  on public.orderry_webhooks (webhook_at desc);

create index if not exists idx_orderry_webhooks_tenant
  on public.orderry_webhooks (tenant_id);

-- 5) Backoffice prealerts (replacement for historical Google rows)
create table if not exists public.backoffice_prealerts (
  id uuid primary key default gen_random_uuid(),
  client text not null default 'UNKNOWN' check (client in ('CLARO', 'XIAOMI', 'RETAILER', 'UNKNOWN')),
  sheet_title text not null default 'Supabase',
  row_number integer,
  customer text,
  reference text,
  order_number text,
  guide text,
  imei text,
  serial text,
  equipment_name text,
  details text,
  request_at timestamptz,
  collected_at timestamptz,
  orderry_at timestamptz,
  status text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_backoffice_prealerts_request_at
  on public.backoffice_prealerts (request_at desc);

create index if not exists idx_backoffice_prealerts_client_request
  on public.backoffice_prealerts (client, request_at desc);

create index if not exists idx_backoffice_prealerts_reference
  on public.backoffice_prealerts (reference);

create index if not exists idx_backoffice_prealerts_order_number
  on public.backoffice_prealerts (order_number);

-- Keep updated_at fresh automatically for backoffice_prealerts.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_backoffice_prealerts_set_updated_at on public.backoffice_prealerts;
create trigger trg_backoffice_prealerts_set_updated_at
before update on public.backoffice_prealerts
for each row
execute function public.set_updated_at();
