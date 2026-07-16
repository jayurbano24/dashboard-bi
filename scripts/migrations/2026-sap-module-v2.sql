-- Migration: SAP Module v2 — lotes, historial, auditoría y campos extendidos
-- Ejecutar en el SQL Editor de Supabase.

-- ── Lotes SAP ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.despacho_sap_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material TEXT NOT NULL DEFAULT '',
  fecha_aceptacion DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_traslado TEXT DEFAULT '',
  nota_entrega TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'GUARDADO SAP',
  fecha_entrega DATE,
  conduce TEXT,
  transportista TEXT,
  recibido_por TEXT,
  observaciones_despacho TEXT,
  usuario_registro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_despacho_sap_lotes_estado ON public.despacho_sap_lotes (estado);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_lotes_fecha ON public.despacho_sap_lotes (fecha_aceptacion DESC);

-- ── Extender equipos SAP ─────────────────────────────────────────────────────
ALTER TABLE public.despacho_sap_equipos
  ALTER COLUMN no_documento DROP NOT NULL;

ALTER TABLE public.despacho_sap_equipos
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES public.despacho_sap_lotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS material TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_aceptacion DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS numero_traslado TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nota_entrega TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS razon_no_orderry TEXT,
  ADD COLUMN IF NOT EXISTS observaciones_no_orderry TEXT,
  ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
  ADD COLUMN IF NOT EXISTS conduce TEXT,
  ADD COLUMN IF NOT EXISTS transportista TEXT,
  ADD COLUMN IF NOT EXISTS recibido_por TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'GUARDADO SAP',
  ADD COLUMN IF NOT EXISTS order_id BIGINT,
  ADD COLUMN IF NOT EXISTS cliente TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS orderry_status TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS usuario_registro TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_despacho_sap_equipos_lote ON public.despacho_sap_equipos (lote_id);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_equipos_estado ON public.despacho_sap_equipos (estado);

-- ── Historial de movimientos (append-only) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.despacho_sap_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID REFERENCES public.despacho_sap_equipos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES public.despacho_sap_lotes(id) ON DELETE SET NULL,
  imei TEXT NOT NULL DEFAULT '',
  accion TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  usuario TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_despacho_sap_history_equipo ON public.despacho_sap_history (equipo_id);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_history_lote ON public.despacho_sap_history (lote_id);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_history_imei ON public.despacho_sap_history (imei);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_history_created ON public.despacho_sap_history (created_at DESC);

-- ── Auditoría ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.despacho_sap_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario TEXT NOT NULL DEFAULT '',
  ip TEXT DEFAULT '',
  accion TEXT NOT NULL,
  imei TEXT DEFAULT '',
  antes JSONB,
  despues JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_despacho_sap_audit_created ON public.despacho_sap_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_despacho_sap_audit_imei ON public.despacho_sap_audit (imei);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.despacho_sap_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despacho_sap_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despacho_sap_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for sap_lotes" ON public.despacho_sap_lotes;
CREATE POLICY "Allow all operations for sap_lotes" ON public.despacho_sap_lotes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations for sap_history" ON public.despacho_sap_history;
CREATE POLICY "Allow all operations for sap_history" ON public.despacho_sap_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations for sap_audit" ON public.despacho_sap_audit;
CREATE POLICY "Allow all operations for sap_audit" ON public.despacho_sap_audit FOR ALL USING (true);
