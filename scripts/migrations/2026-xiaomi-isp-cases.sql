-- Migration: tabla para casos Xiaomi ISP scrapeados diariamente
-- Ejecutar una vez en Supabase SQL Editor.

create table if not exists public.xiaomi_isp_cases (
  id                   uuid primary key default gen_random_uuid(),
  service_order_number text not null,          -- e.g. ASGT26053000000054
  service_type         text,                   -- e.g. Mail_In / Walk-In
  acceptance_time      timestamptz,
  creation_time        timestamptz,
  service_order_status text,                   -- e.g. In Repair, Closed, etc.
  lv1_model            text,                   -- e.g. Redmi Note 12
  oow_iw               text,                   -- "OOW" | "IW"
  raw                  jsonb,                  -- fila completa para referencia
  scraped_at           timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uq_xiaomi_isp_cases_order_number unique (service_order_number)
);

create index if not exists idx_xiaomi_isp_cases_creation_time
  on public.xiaomi_isp_cases (creation_time desc);

create index if not exists idx_xiaomi_isp_cases_status
  on public.xiaomi_isp_cases (service_order_status);

create index if not exists idx_xiaomi_isp_cases_scraped_at
  on public.xiaomi_isp_cases (scraped_at desc);

-- Trigger para mantener updated_at fresco
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_xiaomi_isp_cases_set_updated_at on public.xiaomi_isp_cases;
create trigger trg_xiaomi_isp_cases_set_updated_at
before update on public.xiaomi_isp_cases
for each row execute function public.set_updated_at();
