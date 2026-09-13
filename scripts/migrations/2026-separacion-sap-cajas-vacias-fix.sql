-- Fix rápido: permitir cajas vacías (cantidad_esperada = 0) para flujo guiado de pistoleo
-- Ejecutar en Supabase SQL Editor si falla: separacion_sap_cajas_cantidad_esperada_check

ALTER TABLE public.separacion_sap_cajas
  ALTER COLUMN cantidad_esperada SET DEFAULT 0;

ALTER TABLE public.separacion_sap_cajas
  DROP CONSTRAINT IF EXISTS separacion_sap_cajas_cantidad_esperada_check;

ALTER TABLE public.separacion_sap_cajas
  ADD CONSTRAINT separacion_sap_cajas_cantidad_esperada_check
  CHECK (cantidad_esperada >= 0);
