-- Evita full scan al validar series duplicadas y acelera carga por caja.
-- Ejecutar en Supabase SQL Editor (producción).

CREATE INDEX IF NOT EXISTS idx_separacion_sap_capturas_caja_id
  ON public.separacion_sap_capturas (caja_id);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_capturas_normalized_serial
  ON public.separacion_sap_capturas (normalized_serial);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_capturas_caja_serial
  ON public.separacion_sap_capturas (caja_id, normalized_serial);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_subgrupos_caja_id
  ON public.separacion_sap_caja_subgrupos (caja_id);
