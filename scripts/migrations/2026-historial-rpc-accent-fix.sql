-- Normaliza acentos al comparar nombres de estado en agregaciones

create or replace function public.normalize_estado_label(p_estado text)
returns text
language sql
immutable
as $$
  select upper(
    translate(
      regexp_replace(coalesce(trim(p_estado), ''), '\s+', ' ', 'g'),
      'ÁÉÍÓÚÜÑ',
      'AEIOUUN'
    )
  );
$$;

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
    min(h.fecha_hora_cambio) filter (where public.normalize_estado_label(h.estado_nuevo) = 'EN DIAGNOSTICO') as fecha_para_diagnosticar,
    min(h.fecha_hora_cambio) filter (where public.normalize_estado_label(h.estado_nuevo) = 'EN REPARACION') as fecha_en_reparacion,
    min(h.fecha_hora_cambio) filter (where public.normalize_estado_label(h.estado_nuevo) = 'EN CONTROL DE CALIDAD') as fecha_para_control_calidad,
    min(h.fecha_hora_cambio) filter (
      where public.normalize_estado_label(h.estado_nuevo) = public.normalize_estado_label(p_fecha_para_entregar_estado)
    ) as fecha_para_entregar
  from public.historial_movimientos h
  where h.orden_id = any(p_orden_ids)
  group by h.orden_id;
$$;
