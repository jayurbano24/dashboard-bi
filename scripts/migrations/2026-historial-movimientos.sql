-- Catálogo de estados Orderry + historial de transiciones por orden

create table if not exists public.estados_catalogo (
  status_id integer primary key,
  estado text not null,
  grupo text not null,
  grupo_type integer,
  color text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_estados_catalogo_grupo
  on public.estados_catalogo (grupo);

create index if not exists idx_estados_catalogo_estado
  on public.estados_catalogo (estado);

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
  created_at timestamptz not null default now()
);

create index if not exists idx_historial_orden_fecha
  on public.historial_movimientos (orden_id, fecha_hora_cambio);

create index if not exists idx_historial_grupo
  on public.historial_movimientos (orden_id, grupo_nuevo);

create index if not exists idx_historial_estado_nuevo
  on public.historial_movimientos (orden_id, estado_nuevo);

-- Agregación de fechas por orden (usada por la plantilla de reporte)
create or replace function public.get_historial_fechas_por_ordenes(
  p_orden_ids text[],
  p_fecha_para_entregar_estado text default 'PARA DEVOLUCION'
)
returns table (
  orden_id text,
  fecha_entrada_nuevo timestamptz,
  fecha_entrada_en_progreso timestamptz,
  fecha_entrada_pendiente timestamptz,
  fecha_entrada_listo timestamptz,
  fecha_entrada_entrega timestamptz,
  fecha_entrada_ganado timestamptz,
  fecha_entrada_perdido timestamptz,
  fecha_para_diagnosticar timestamptz,
  fecha_en_reparacion timestamptz,
  fecha_para_control_calidad timestamptz,
  fecha_para_entregar timestamptz
)
language sql
stable
as $$
  select
    h.orden_id,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'Nuevo') as fecha_entrada_nuevo,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'En progreso') as fecha_entrada_en_progreso,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'Pendiente') as fecha_entrada_pendiente,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'Listo') as fecha_entrada_listo,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'Entrega') as fecha_entrada_entrega,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'Ganado') as fecha_entrada_ganado,
    min(h.fecha_hora_cambio) filter (where h.grupo_nuevo = 'Perdido') as fecha_entrada_perdido,
    min(h.fecha_hora_cambio) filter (where upper(trim(h.estado_nuevo)) = 'EN DIAGNOSTICO') as fecha_para_diagnosticar,
    min(h.fecha_hora_cambio) filter (where upper(trim(h.estado_nuevo)) = 'EN REPARACION') as fecha_en_reparacion,
    min(h.fecha_hora_cambio) filter (where upper(trim(h.estado_nuevo)) = 'EN CONTROL DE CALIDAD') as fecha_para_control_calidad,
    min(h.fecha_hora_cambio) filter (
      where upper(trim(h.estado_nuevo)) = upper(trim(p_fecha_para_entregar_estado))
    ) as fecha_para_entregar
  from public.historial_movimientos h
  where h.orden_id = any(p_orden_ids)
  group by h.orden_id;
$$;
