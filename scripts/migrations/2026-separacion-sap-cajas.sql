-- Migration: Módulo Separación SAP — Inventario Excel, Cajas PX, Capturas y Catálogos
-- ═══════════════════════════════════════════════════════════════════════════════
-- CÓMO APLICAR EN SUPABASE:
--   1. Abrir https://supabase.com/dashboard → tu proyecto → SQL Editor
--   2. New query → pegar TODO este archivo → Run
--   3. Verificar: Table Editor debe mostrar las tablas separacion_sap_*
--   4. En la app: GET /api/separacion-sap/schema (usuario autenticado)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Secuencia para números de caja (CAJA-000001, CAJA-000002, …)
CREATE SEQUENCE IF NOT EXISTS public.separacion_sap_caja_numero_seq START WITH 1 INCREMENT BY 1;

-- ── BSD: fuente de verdad de series por bodega ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_bsd_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_codigo TEXT NOT NULL,
  material_texto TEXT NOT NULL DEFAULT '',
  normalized_serial TEXT NOT NULL,
  centro TEXT NOT NULL,
  almacen TEXT NOT NULL DEFAULT 'D000',
  lote TEXT NOT NULL DEFAULT 'NOVALORADO',
  status_sistema TEXT NOT NULL DEFAULT 'ALMA',
  import_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_separacion_sap_bsd_serial UNIQUE (normalized_serial)
);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_bsd_centro
  ON public.separacion_sap_bsd_equipos (centro);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_bsd_material
  ON public.separacion_sap_bsd_equipos (material_codigo);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_bsd_centro_material
  ON public.separacion_sap_bsd_equipos (centro, material_codigo);

-- ── Catálogo: marcas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_separacion_sap_marca_nombre UNIQUE (nombre)
);

-- ── Catálogo: modelos homologados (reglas de escaneo) ────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo_producto TEXT NOT NULL DEFAULT 'UNIDAD_COMPLETA'
    CHECK (tipo_producto IN ('UNIDAD_COMPLETA', 'TARJETA')),
  longitud_digitos INT NOT NULL DEFAULT 15
    CHECK (longitud_digitos BETWEEN 5 AND 30),
  esquema_series TEXT NOT NULL DEFAULT 'S1'
    CHECK (esquema_series IN ('S1', 'S1_S2')),
  material_defecto TEXT NOT NULL DEFAULT '',
  texto_defecto TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_separacion_sap_modelo_marca_modelo UNIQUE (marca, modelo)
);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_modelos_marca
  ON public.separacion_sap_modelos (marca);

-- ── Cajas PX ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_cajas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_caja TEXT NOT NULL,
  centro TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo_producto TEXT NOT NULL DEFAULT 'UNIDAD_COMPLETA'
    CHECK (tipo_producto IN ('UNIDAD_COMPLETA', 'TARJETA')),
  subgrupo TEXT NOT NULL DEFAULT 'LINEA_1',
  material_codigo TEXT NOT NULL,
  material_texto TEXT NOT NULL DEFAULT '',
  almacen TEXT NOT NULL DEFAULT 'D000',
  cantidad_esperada INT NOT NULL DEFAULT 0 CHECK (cantidad_esperada >= 0),
  cantidad_capturada INT NOT NULL DEFAULT 0 CHECK (cantidad_capturada >= 0),
  estado TEXT NOT NULL DEFAULT 'ABIERTA'
    CHECK (estado IN ('ABIERTA', 'CERRADA', 'DESPACHADA')),
  ubicacion TEXT NOT NULL DEFAULT '',
  tarima TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  longitud_digitos INT NOT NULL DEFAULT 15,
  esquema_series TEXT NOT NULL DEFAULT 'S1'
    CHECK (esquema_series IN ('S1', 'S1_S2')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en TIMESTAMPTZ,
  despachada_en TIMESTAMPTZ,
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_separacion_sap_caja_numero UNIQUE (numero_caja),
  CONSTRAINT chk_separacion_sap_caja_captura_lte_esperada
    CHECK (cantidad_capturada <= cantidad_esperada)
);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_cajas_centro
  ON public.separacion_sap_cajas (centro);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_cajas_estado
  ON public.separacion_sap_cajas (estado);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_cajas_material
  ON public.separacion_sap_cajas (material_codigo);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_cajas_creada
  ON public.separacion_sap_cajas (creada_en DESC);

-- ── Capturas de series (1 físico = 1 serial = 1 caja) ────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_capturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL
    REFERENCES public.separacion_sap_cajas(id) ON DELETE CASCADE,
  normalized_serial TEXT NOT NULL,
  normalized_serial_s2 TEXT,
  esquema_series TEXT NOT NULL DEFAULT 'S1',
  material_codigo TEXT NOT NULL,
  material_texto TEXT,
  centro TEXT NOT NULL,
  almacen TEXT NOT NULL DEFAULT 'D000',
  lote TEXT,
  status_bsd TEXT,
  status_captura TEXT NOT NULL DEFAULT 'BASE_ENCONTRADO',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by TEXT,
  CONSTRAINT uq_separacion_sap_captura_s1 UNIQUE (normalized_serial)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_separacion_sap_captura_s2
  ON public.separacion_sap_capturas (normalized_serial_s2)
  WHERE normalized_serial_s2 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_separacion_sap_capturas_caja
  ON public.separacion_sap_capturas (caja_id);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_capturas_captured
  ON public.separacion_sap_capturas (captured_at DESC);

-- ── Auditoría de rechazos del scanner ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_rechazos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID
    REFERENCES public.separacion_sap_cajas(id) ON DELETE SET NULL,
  raw_serial TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_rechazos_caja
  ON public.separacion_sap_rechazos (caja_id);
CREATE INDEX IF NOT EXISTS idx_separacion_sap_rechazos_created
  ON public.separacion_sap_rechazos (created_at DESC);

-- ── Log de importaciones Excel SAP ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.separacion_sap_bsd_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  registros_totales INT NOT NULL DEFAULT 0,
  registros_g945 INT NOT NULL DEFAULT 0,
  materiales_detectados INT NOT NULL DEFAULT 0,
  imported_by TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_bsd_imports_activo
  ON public.separacion_sap_bsd_imports (activo, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_bsd_import_batch
  ON public.separacion_sap_bsd_equipos (import_batch_id);

-- ── Triggers updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_separacion_sap_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_separacion_sap_bsd_updated ON public.separacion_sap_bsd_equipos;
CREATE TRIGGER trg_separacion_sap_bsd_updated
  BEFORE UPDATE ON public.separacion_sap_bsd_equipos
  FOR EACH ROW EXECUTE FUNCTION public.set_separacion_sap_updated_at();

DROP TRIGGER IF EXISTS trg_separacion_sap_modelos_updated ON public.separacion_sap_modelos;
CREATE TRIGGER trg_separacion_sap_modelos_updated
  BEFORE UPDATE ON public.separacion_sap_modelos
  FOR EACH ROW EXECUTE FUNCTION public.set_separacion_sap_updated_at();

DROP TRIGGER IF EXISTS trg_separacion_sap_cajas_updated ON public.separacion_sap_cajas;
CREATE TRIGGER trg_separacion_sap_cajas_updated
  BEFORE UPDATE ON public.separacion_sap_cajas
  FOR EACH ROW EXECUTE FUNCTION public.set_separacion_sap_updated_at();

-- Sincronizar contador de capturas al insertar/eliminar
CREATE OR REPLACE FUNCTION public.sync_separacion_sap_caja_capturada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_caja UUID;
BEGIN
  target_caja := COALESCE(NEW.caja_id, OLD.caja_id);

  UPDATE public.separacion_sap_cajas c
  SET cantidad_capturada = (
    SELECT COUNT(*)::INT FROM public.separacion_sap_capturas cap WHERE cap.caja_id = target_caja
  )
  WHERE c.id = target_caja;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_separacion_sap_capturas_count_ins ON public.separacion_sap_capturas;
CREATE TRIGGER trg_separacion_sap_capturas_count_ins
  AFTER INSERT ON public.separacion_sap_capturas
  FOR EACH ROW EXECUTE FUNCTION public.sync_separacion_sap_caja_capturada();

DROP TRIGGER IF EXISTS trg_separacion_sap_capturas_count_del ON public.separacion_sap_capturas;
CREATE TRIGGER trg_separacion_sap_capturas_count_del
  AFTER DELETE ON public.separacion_sap_capturas
  FOR EACH ROW EXECUTE FUNCTION public.sync_separacion_sap_caja_capturada();

-- Helper: siguiente número de caja
CREATE OR REPLACE FUNCTION public.next_separacion_sap_numero_caja()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.separacion_sap_caja_numero_seq');
  RETURN 'CAJA-' || lpad(seq_val::TEXT, 6, '0');
END;
$$;

-- ── RLS: usuarios autenticados (módulo Despacho / Separación SAP) ────────────
ALTER TABLE public.separacion_sap_bsd_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacion_sap_marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacion_sap_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacion_sap_cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacion_sap_capturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacion_sap_rechazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacion_sap_bsd_imports ENABLE ROW LEVEL SECURITY;

-- Inventario SAP (series del Excel)
DROP POLICY IF EXISTS "Allow all separacion_sap_bsd" ON public.separacion_sap_bsd_equipos;
DROP POLICY IF EXISTS "auth read separacion_sap_bsd" ON public.separacion_sap_bsd_equipos;
DROP POLICY IF EXISTS "auth write separacion_sap_bsd" ON public.separacion_sap_bsd_equipos;
CREATE POLICY "auth read separacion_sap_bsd" ON public.separacion_sap_bsd_equipos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write separacion_sap_bsd" ON public.separacion_sap_bsd_equipos
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Marcas
DROP POLICY IF EXISTS "Allow all separacion_sap_marcas" ON public.separacion_sap_marcas;
DROP POLICY IF EXISTS "auth separacion_sap_marcas" ON public.separacion_sap_marcas;
CREATE POLICY "auth separacion_sap_marcas" ON public.separacion_sap_marcas
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Modelos
DROP POLICY IF EXISTS "Allow all separacion_sap_modelos" ON public.separacion_sap_modelos;
DROP POLICY IF EXISTS "auth separacion_sap_modelos" ON public.separacion_sap_modelos;
CREATE POLICY "auth separacion_sap_modelos" ON public.separacion_sap_modelos
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Cajas
DROP POLICY IF EXISTS "Allow all separacion_sap_cajas" ON public.separacion_sap_cajas;
DROP POLICY IF EXISTS "auth separacion_sap_cajas" ON public.separacion_sap_cajas;
CREATE POLICY "auth separacion_sap_cajas" ON public.separacion_sap_cajas
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Capturas
DROP POLICY IF EXISTS "Allow all separacion_sap_capturas" ON public.separacion_sap_capturas;
DROP POLICY IF EXISTS "auth separacion_sap_capturas" ON public.separacion_sap_capturas;
CREATE POLICY "auth separacion_sap_capturas" ON public.separacion_sap_capturas
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Rechazos auditoría
DROP POLICY IF EXISTS "Allow all separacion_sap_rechazos" ON public.separacion_sap_rechazos;
DROP POLICY IF EXISTS "auth separacion_sap_rechazos" ON public.separacion_sap_rechazos;
CREATE POLICY "auth separacion_sap_rechazos" ON public.separacion_sap_rechazos
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Importaciones Excel
DROP POLICY IF EXISTS "Allow all separacion_sap_bsd_imports" ON public.separacion_sap_bsd_imports;
DROP POLICY IF EXISTS "auth separacion_sap_bsd_imports" ON public.separacion_sap_bsd_imports;
CREATE POLICY "auth separacion_sap_bsd_imports" ON public.separacion_sap_bsd_imports
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Service role (API server-side con SUPABASE_SERVICE_ROLE_KEY)
DROP POLICY IF EXISTS "service role separacion_sap_bsd" ON public.separacion_sap_bsd_equipos;
DROP POLICY IF EXISTS "service role separacion_sap_marcas" ON public.separacion_sap_marcas;
DROP POLICY IF EXISTS "service role separacion_sap_modelos" ON public.separacion_sap_modelos;
DROP POLICY IF EXISTS "service role separacion_sap_cajas" ON public.separacion_sap_cajas;
DROP POLICY IF EXISTS "service role separacion_sap_capturas" ON public.separacion_sap_capturas;
DROP POLICY IF EXISTS "service role separacion_sap_rechazos" ON public.separacion_sap_rechazos;
DROP POLICY IF EXISTS "service role separacion_sap_bsd_imports" ON public.separacion_sap_bsd_imports;

CREATE POLICY "service role separacion_sap_bsd" ON public.separacion_sap_bsd_equipos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role separacion_sap_marcas" ON public.separacion_sap_marcas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role separacion_sap_modelos" ON public.separacion_sap_modelos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role separacion_sap_cajas" ON public.separacion_sap_cajas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role separacion_sap_capturas" ON public.separacion_sap_capturas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role separacion_sap_rechazos" ON public.separacion_sap_rechazos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role separacion_sap_bsd_imports" ON public.separacion_sap_bsd_imports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permisos para roles de Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_bsd_equipos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_marcas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_modelos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_cajas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_capturas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_rechazos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_bsd_imports TO authenticated;

GRANT ALL ON public.separacion_sap_bsd_equipos TO service_role;
GRANT ALL ON public.separacion_sap_marcas TO service_role;
GRANT ALL ON public.separacion_sap_modelos TO service_role;
GRANT ALL ON public.separacion_sap_cajas TO service_role;
GRANT ALL ON public.separacion_sap_capturas TO service_role;
GRANT ALL ON public.separacion_sap_rechazos TO service_role;
GRANT ALL ON public.separacion_sap_bsd_imports TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.separacion_sap_caja_numero_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.separacion_sap_caja_numero_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.next_separacion_sap_numero_caja() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_separacion_sap_numero_caja() TO service_role;
