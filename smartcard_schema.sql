-- Tabla para Cajas de Smart Card
CREATE TABLE IF NOT EXISTS public.smartcard_cajas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_caja VARCHAR(255) NOT NULL,
    marca VARCHAR(255) DEFAULT 'Desconocida',
    modelo VARCHAR(255) NOT NULL,
    cantidad_objetivo INTEGER NOT NULL,
    requiere_validacion BOOLEAN DEFAULT false,
    estado VARCHAR(50) DEFAULT 'En Proceso', -- 'En Proceso', 'Cerrada'
    usuario_registro VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para Items/Series dentro de la caja de Smart Card
CREATE TABLE IF NOT EXISTS public.smartcard_caja_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID REFERENCES public.smartcard_cajas(id) ON DELETE CASCADE,
    serie_principal VARCHAR(255) NOT NULL,
    material_sap VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'Validado',
    usuario VARCHAR(255),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Restricción para asegurar que una serie principal no se duplique globalmente en las smartcards
    CONSTRAINT smartcard_serie_unique UNIQUE (serie_principal)
);

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_smartcard_cajas_numero ON public.smartcard_cajas(numero_caja);
CREATE INDEX IF NOT EXISTS idx_smartcard_caja_items_caja_id ON public.smartcard_caja_items(caja_id);
CREATE INDEX IF NOT EXISTS idx_smartcard_caja_items_serie ON public.smartcard_caja_items(serie_principal);
