-- Migration: Tabla para Ingreso de Equipos SAP
-- Ejecutar en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS public.despacho_sap_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia TEXT NOT NULL DEFAULT '',
  imei_fisico TEXT NOT NULL,
  no_documento TEXT NOT NULL DEFAULT '',
  marca TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  guia TEXT NOT NULL DEFAULT '',
  dia DATE NOT NULL DEFAULT CURRENT_DATE,
  comentario TEXT DEFAULT 'ACEPTADO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  constraint uq_despacho_sap_equipos_imei unique (imei_fisico)
);

CREATE INDEX IF NOT EXISTS idx_despacho_sap_equipos_imei ON public.despacho_sap_equipos (imei_fisico);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_equipos_dia ON public.despacho_sap_equipos (dia desc);

-- Políticas RLS (Row Level Security) habilitadas y públicas temporalmente
ALTER TABLE public.despacho_sap_equipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for sap_equipos" ON public.despacho_sap_equipos;
CREATE POLICY "Allow all operations for sap_equipos" ON public.despacho_sap_equipos FOR ALL USING (true);
