-- Área "Separación SAP" + función get_my_accessible_areas actualizada

insert into public.role_area_access (role, area)
values
  ('despacho', 'Separación SAP'),
  ('supervisor', 'Separación SAP'),
  ('viewer', 'Separación SAP')
on conflict (role, area) do nothing;

-- Usuarios despacho existentes: agregar área al perfil si ya tenían Despacho
update public.user_profiles up
set areas = (
  select array_agg(distinct a)
  from unnest(coalesce(up.areas, '{}'::text[]) || array['Separación SAP']::text[]) as a
)
where exists (
  select 1 from public.user_roles ur
  where ur.user_id = up.user_id and ur.role in ('despacho', 'supervisor')
);

create or replace function public.get_my_accessible_areas()
returns text[]
language plpgsql
stable
security definer
as $$
declare
  current_role text;
  profile_areas text[];
begin
  select role into current_role
  from public.user_roles
  where user_id = auth.uid()
  limit 1;

  if current_role is null then
    return array[]::text[];
  end if;

  if current_role = 'admin' then
    return array[
      'Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad',
      'ERP Xiaomi', 'Bono Técnico', 'Despacho', 'Separación SAP'
    ];
  end if;

  select areas into profile_areas
  from public.user_profiles
  where user_id = auth.uid()
  limit 1;

  return coalesce(
    array(
      select distinct access.area
      from public.role_area_access access
      where access.role = current_role
        and access.area = any(coalesce(profile_areas, array[]::text[]))
      order by access.area
    ),
    array[]::text[]
  );
end;
$$;
