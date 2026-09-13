-- Fix: evitar violación de chk_separacion_sap_caja_captura_lte_esperada
-- El trigger actualizaba solo cantidad_capturada mientras cantidad_esperada quedaba desactualizada.

CREATE OR REPLACE FUNCTION public.sync_separacion_sap_caja_contadores(p_caja_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_esperada INT;
  v_capturada INT;
BEGIN
  SELECT COALESCE(SUM(cantidad_esperada), 0)::INT INTO v_esperada
  FROM public.separacion_sap_caja_subgrupos
  WHERE caja_id = p_caja_id;

  SELECT COUNT(*)::INT INTO v_capturada
  FROM public.separacion_sap_capturas
  WHERE caja_id = p_caja_id;

  UPDATE public.separacion_sap_cajas
  SET
    cantidad_esperada = v_esperada,
    cantidad_capturada = v_capturada
  WHERE id = p_caja_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_separacion_sap_caja_capturada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_caja UUID;
BEGIN
  target_caja := COALESCE(NEW.caja_id, OLD.caja_id);
  PERFORM public.sync_separacion_sap_caja_contadores(target_caja);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_separacion_sap_caja_desde_subgrupos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_caja UUID;
BEGIN
  target_caja := COALESCE(NEW.caja_id, OLD.caja_id);
  PERFORM public.sync_separacion_sap_caja_contadores(target_caja);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_separacion_sap_subgrupos_sync_caja ON public.separacion_sap_caja_subgrupos;
CREATE TRIGGER trg_separacion_sap_subgrupos_sync_caja
  AFTER INSERT OR UPDATE OR DELETE ON public.separacion_sap_caja_subgrupos
  FOR EACH ROW EXECUTE FUNCTION public.sync_separacion_sap_caja_desde_subgrupos();
