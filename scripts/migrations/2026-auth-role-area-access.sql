-- RBAC schema repair for Dashboard-BI
-- Run this once in Supabase SQL Editor if role_area_access is missing.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  first_name text,
  last_name text,
  areas text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);

alter table public.user_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_profiles enable row level security;

drop policy if exists "users can read own profile" on public.user_profiles;
drop policy if exists "users can update own profile" on public.user_profiles;
drop policy if exists "admins can manage profiles" on public.user_profiles;

create policy "users can read own profile" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "users can update own profile" on public.user_profiles
  for update using (auth.uid() = user_id);

create policy "admins can manage profiles" on public.user_profiles
  for all using (public.is_admin_user(auth.uid()));

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_user_profiles_updated_at();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  role text not null check (role in ('admin', 'supervisor', 'despacho', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);

alter table public.user_roles
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_roles enable row level security;

drop policy if exists "users can read role row" on public.user_roles;
drop policy if exists "admins can manage roles" on public.user_roles;

create policy "users can read role row" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

create policy "admins can manage roles" on public.user_roles
  for all using (public.is_admin_user(auth.uid()));

create or replace function public.set_user_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_user_roles_updated_at();

create table if not exists public.role_area_access (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'supervisor', 'despacho', 'viewer')),
  area text not null,
  created_at timestamptz not null default now(),
  constraint uq_role_area_access unique (role, area)
);

create index if not exists idx_role_area_access_role on public.role_area_access(role);

alter table public.role_area_access enable row level security;

drop policy if exists "admins can manage profiles" on public.user_profiles;
drop policy if exists "users can read role row" on public.user_roles;
drop policy if exists "admins can manage roles" on public.user_roles;
drop policy if exists "users can view own role" on public.user_roles;
drop policy if exists "users can create own viewer role" on public.user_roles;
drop policy if exists "admins can update roles" on public.user_roles;
drop policy if exists "admins can delete roles" on public.user_roles;
drop policy if exists "admins can manage role area access" on public.role_area_access;

create or replace function public.is_admin_user(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = target_user and role = 'admin'
  );
$$;

drop policy if exists "users can view role area access" on public.role_area_access;
drop policy if exists "admins can manage role area access" on public.role_area_access;

create policy "users can view role area access" on public.role_area_access
  for select using (auth.uid() is not null);

create policy "admins can manage role area access" on public.role_area_access
  for all using (public.is_admin_user(auth.uid()));

insert into public.role_area_access (role, area)
values
  ('viewer', 'Gerencial'),
  ('viewer', 'Backoffice'),
  ('viewer', 'Taller'),
  ('viewer', 'Bodega'),
  ('viewer', 'Calidad'),
  ('viewer', 'Claims'),
  ('viewer', 'Subir Claims'),
  ('viewer', 'Bono Técnico'),
  ('viewer', 'Despacho'),
  ('supervisor', 'Gerencial'),
  ('supervisor', 'Backoffice'),
  ('supervisor', 'Taller'),
  ('supervisor', 'Bodega'),
  ('supervisor', 'Calidad'),
  ('supervisor', 'Claims'),
  ('supervisor', 'Subir Claims'),
  ('supervisor', 'Bono Técnico'),
  ('supervisor', 'Despacho'),
  ('despacho', 'Despacho')
on conflict (role, area) do nothing;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;

create or replace function public.get_my_accessible_areas()
returns text[]
language plpgsql
stable
security definer
set search_path = public
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
    return array['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'Claims', 'Subir Claims', 'Bono Técnico', 'Despacho'];
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