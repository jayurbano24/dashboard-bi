-- ==========================================
-- SCRIPT DE BASE DE DATOS: MÓDULO CLAIMS XIAOMI
-- Ejecuta este script en el SQL Editor de tu Supabase
-- ==========================================

-- 1. Tabla de Configuración Global (Key-Value)
CREATE TABLE IF NOT EXISTS public.xiaomi_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insertar valores por defecto sugeridos en la especificación
INSERT INTO public.xiaomi_config (key, value, description) VALUES
    ('ISP_SC_CODE', 'GTM00010', 'Código de centro de servicio ISP'),
    ('SERVICE_CENTER_CODE', 'GT-TCW-MSC-Guatemala', 'Código de Centro de Servicio Oficial'),
    ('CUSTOMER_EMAIL', 'recepcion_gt@mi.com', 'Email por defecto para los reportes'),
    ('CUSTOMER_TYPE', 'RETAILER', 'Tipo de cliente por defecto'),
    ('SERVICE_MODE', 'Mail_In', 'Modo de servicio por defecto'),
    ('IW_OOW', 'IW', 'Garantía predeterminada para reclamos'),
    ('SERVICE_SUBTYPE', 'On_site_pick_and_repair', 'Subtipo de servicio por defecto'),
    ('REMARK', 'Garantia Cobrada', 'Observación por defecto')
ON CONFLICT (key) DO NOTHING;

-- 2. Tabla de Catálogo de Modelos
CREATE TABLE IF NOT EXISTS public.xiaomi_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca VARCHAR(100) DEFAULT 'XIAOMI',
    modelo_comercial VARCHAR(255) NOT NULL,
    color VARCHAR(100) DEFAULT '',
    codigo_pcba VARCHAR(100) NOT NULL,
    goods_id VARCHAR(50) NOT NULL,
    categoria VARCHAR(100) NOT NULL, -- SMARTPHONE, TABLET, FEATURE PHONE
    estado BOOLEAN DEFAULT true, -- Activo/Inactivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla de Catálogo de Fallas
CREATE TABLE IF NOT EXISTS public.xiaomi_faults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_xiaomi VARCHAR(100) NOT NULL, -- Ej: MP00FUN1801
    descripcion TEXT NOT NULL, -- Ej: No Charging
    palabras_clave TEXT, -- Ej: carga, puerto, pin, centro de carga
    categoria VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabla de Catálogo de Veredictos
CREATE TABLE IF NOT EXISTS public.xiaomi_verdicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veredicto VARCHAR(255) NOT NULL, -- Ej: Nota de Crédito
    service_type VARCHAR(100) NOT NULL, -- Ej: Inspection
    processing_method_code VARCHAR(50) NOT NULL, -- Ej: 3001
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabla de Historial de Exportaciones
CREATE TABLE IF NOT EXISTS public.xiaomi_export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario VARCHAR(255) NOT NULL,
    cantidad_registros INTEGER NOT NULL,
    nombre_archivo VARCHAR(500) NOT NULL,
    estado VARCHAR(50) DEFAULT 'Generado',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabla de Auditoría (Trazabilidad)
CREATE TABLE IF NOT EXISTS public.xiaomi_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario VARCHAR(255) NOT NULL,
    accion VARCHAR(100) NOT NULL, -- Ej: EXPORT, UPDATE_MODEL, DELETE_FAULT
    claim_afectado VARCHAR(255), -- ID de orden u objeto afectado
    valor_anterior JSONB,
    valor_nuevo JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activar Row Level Security (opcional, por ahora lo dejamos público para fácil acceso local)
-- Si tienes autenticación estricta con Supabase Auth, cambia a TRUE y añade políticas.
ALTER TABLE public.xiaomi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xiaomi_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xiaomi_faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xiaomi_verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xiaomi_export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xiaomi_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas temporales para permitir todo (Asegúrate de ajustarlas después si usas roles)
CREATE POLICY "Allow all operations for config" ON public.xiaomi_config FOR ALL USING (true);
CREATE POLICY "Allow all operations for models" ON public.xiaomi_models FOR ALL USING (true);
CREATE POLICY "Allow all operations for faults" ON public.xiaomi_faults FOR ALL USING (true);
CREATE POLICY "Allow all operations for verdicts" ON public.xiaomi_verdicts FOR ALL USING (true);
CREATE POLICY "Allow all operations for history" ON public.xiaomi_export_history FOR ALL USING (true);
CREATE POLICY "Allow all operations for audit" ON public.xiaomi_audit_logs FOR ALL USING (true);
