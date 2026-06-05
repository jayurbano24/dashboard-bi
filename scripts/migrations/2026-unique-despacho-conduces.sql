-- Enforce unique, non-repeatable No. Conduce for despacho
-- Run this script once in Supabase SQL Editor.

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
