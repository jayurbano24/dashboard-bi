-- Migration: Sub-Grupos por Caja (multi Marca/Modelo/Material) + capturas vinculadas
-- Ejecutar en Supabase SQL Editor después de 2026-separacion-sap-cajas.sql

CREATE TABLE IF NOT EXISTS public.separacion_sap_caja_subgrupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL
    REFERENCES public.separacion_sap_cajas(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo_producto TEXT NOT NULL DEFAULT 'UNIDAD_COMPLETA'
    CHECK (tipo_producto IN ('UNIDAD_COMPLETA', 'TARJETA')),
  material_codigo TEXT NOT NULL,
  material_texto TEXT NOT NULL DEFAULT '',
  cantidad_esperada INT NOT NULL CHECK (cantidad_esperada > 0),
  cantidad_capturada INT NOT NULL DEFAULT 0 CHECK (cantidad_capturada >= 0),
  longitud_digitos INT NOT NULL DEFAULT 15
    CHECK (longitud_digitos BETWEEN 5 AND 30),
  esquema_series TEXT NOT NULL DEFAULT 'S1'
    CHECK (esquema_series IN ('S1', 'S1_S2')),
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_separacion_sap_subgrupo_captura_lte_esperada
    CHECK (cantidad_capturada <= cantidad_esperada)
);

CREATE INDEX IF NOT EXISTS idx_separacion_sap_subgrupos_caja
  ON public.separacion_sap_caja_subgrupos (caja_id);

ALTER TABLE public.separacion_sap_capturas
  ADD COLUMN IF NOT EXISTS subgrupo_id UUID
    REFERENCES public.separacion_sap_caja_subgrupos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_separacion_sap_capturas_subgrupo
  ON public.separacion_sap_capturas (subgrupo_id);

DROP TRIGGER IF EXISTS trg_separacion_sap_subgrupos_updated ON public.separacion_sap_caja_subgrupos;
CREATE TRIGGER trg_separacion_sap_subgrupos_updated
  BEFORE UPDATE ON public.separacion_sap_caja_subgrupos
  FOR EACH ROW EXECUTE FUNCTION public.set_separacion_sap_updated_at();

ALTER TABLE public.separacion_sap_caja_subgrupos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth separacion_sap_subgrupos" ON public.separacion_sap_caja_subgrupos;
CREATE POLICY "auth separacion_sap_subgrupos" ON public.separacion_sap_caja_subgrupos
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "service role separacion_sap_subgrupos" ON public.separacion_sap_caja_subgrupos;
CREATE POLICY "service role separacion_sap_subgrupos" ON public.separacion_sap_caja_subgrupos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.separacion_sap_caja_subgrupos TO authenticated;
GRANT ALL ON public.separacion_sap_caja_subgrupos TO service_role;

-- Sincronizar contador de capturas por sub-grupo
CREATE OR REPLACE FUNCTION public.sync_separacion_sap_subgrupo_capturada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_subgrupo UUID;
BEGIN
  target_subgrupo := COALESCE(NEW.subgrupo_id, OLD.subgrupo_id);
  IF target_subgrupo IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.separacion_sap_caja_subgrupos sg
  SET cantidad_capturada = (
    SELECT COUNT(*)::INT FROM public.separacion_sap_capturas cap WHERE cap.subgrupo_id = target_subgrupo
  )
  WHERE sg.id = target_subgrupo;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_separacion_sap_capturas_subgrupo_ins ON public.separacion_sap_capturas;
CREATE TRIGGER trg_separacion_sap_capturas_subgrupo_ins
  AFTER INSERT ON public.separacion_sap_capturas
  FOR EACH ROW EXECUTE FUNCTION public.sync_separacion_sap_subgrupo_capturada();

DROP TRIGGER IF EXISTS trg_separacion_sap_capturas_subgrupo_del ON public.separacion_sap_capturas;
CREATE TRIGGER trg_separacion_sap_capturas_subgrupo_del
  AFTER DELETE ON public.separacion_sap_capturas
  FOR EACH ROW EXECUTE FUNCTION public.sync_separacion_sap_subgrupo_capturada();
