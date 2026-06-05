-- ============================================================
-- AUTH SCHEMA: user_roles table
-- Run this in Supabase SQL Editor AFTER applying supabase_schema.sql
-- ============================================================

-- Tabla de roles de usuario
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'despacho', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index para lookups rápidos
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_user(target_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = target_user
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "users can create own viewer role" ON public.user_roles;
DROP POLICY IF EXISTS "admins can manage all roles" ON public.user_roles;

-- Solo admins y el propio usuario pueden ver su rol
CREATE POLICY "users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "users can create own viewer role" ON public.user_roles
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND role = 'viewer')
    OR public.is_admin_user(auth.uid())
  );

CREATE POLICY "admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.is_admin_user(auth.uid()));

-- Tabla de perfil de usuario
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  areas       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admins can manage all profiles" ON public.user_profiles;

CREATE POLICY "users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can create own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admins can manage all profiles" ON public.user_profiles
  FOR ALL USING (public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_user_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_user_profiles_updated_at();

-- Tabla de áreas permitidas por rol
CREATE TABLE IF NOT EXISTS public.role_area_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'despacho', 'viewer')),
  area        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, area)
);

CREATE INDEX IF NOT EXISTS idx_role_area_access_role ON public.role_area_access(role);

ALTER TABLE public.role_area_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view role area access" ON public.role_area_access;
DROP POLICY IF EXISTS "admins can manage role area access" ON public.role_area_access;

CREATE POLICY "users can view role area access" ON public.role_area_access
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admins can manage role area access" ON public.role_area_access
  FOR ALL USING (public.is_admin_user(auth.uid()));

INSERT INTO public.role_area_access (role, area)
VALUES
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
ON CONFLICT (role, area) DO NOTHING;

-- ============================================================
-- ROLES Y PERMISOS
-- admin      → acceso total, puede gestionar usuarios
-- supervisor → dashboard completo + despacho, sin gestión de usuarios
-- despacho   → solo módulo de despacho
-- viewer     → solo lectura del dashboard principal
-- ============================================================

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_accessible_areas()
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  current_role TEXT;
  profile_areas TEXT[];
BEGIN
  SELECT role INTO current_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF current_role IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  IF current_role = 'admin' THEN
    RETURN ARRAY['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'Claims', 'Subir Claims', 'Bono Técnico', 'Despacho'];
  END IF;

  SELECT areas INTO profile_areas
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(
    ARRAY(
      SELECT DISTINCT access.area
      FROM public.role_area_access access
      WHERE access.role = current_role
        AND access.area = ANY(COALESCE(profile_areas, ARRAY[]::TEXT[]))
      ORDER BY access.area
    ),
    ARRAY[]::TEXT[]
  );
END;
$$;
