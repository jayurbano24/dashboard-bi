-- Migration: Sub-Grupos guiados (estado, valoración, cantidad SAP)
-- Ejecutar después de 2026-separacion-sap-caja-subgrupos.sql

-- ── Cajas vacías (flujo guiado: crear caja sin sub-grupos previos) ─────────────
ALTER TABLE public.separacion_sap_cajas
  ALTER COLUMN cantidad_esperada SET DEFAULT 0;

ALTER TABLE public.separacion_sap_cajas
  DROP CONSTRAINT IF EXISTS separacion_sap_cajas_cantidad_esperada_check;

ALTER TABLE public.separacion_sap_cajas
  ADD CONSTRAINT separacion_sap_cajas_cantidad_esperada_check
  CHECK (cantidad_esperada >= 0);

ALTER TABLE public.separacion_sap_caja_subgrupos
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'EN_PROGRESO'
    CHECK (estado IN ('EN_PROGRESO', 'LLENO', 'PENDIENTE_VALIDAR_SAP')),
  ADD COLUMN IF NOT EXISTS valoracion TEXT
    CHECK (valoracion IS NULL OR valoracion IN ('VALORADO', 'NO_VALORADO', 'PENDIENTE')),
  ADD COLUMN IF NOT EXISTS cantidad_disponible_sap INT;

COMMENT ON COLUMN public.separacion_sap_caja_subgrupos.estado IS
  'EN_PROGRESO: pistoleo activo; LLENO: cantidad alcanzada; PENDIENTE_VALIDAR_SAP: serie no validada en SAP (según config)';
