import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Configuración genérica para omitir errores de tabla no existente durante desarrollo
const isMissingTableError = (error: any) => {
  return error?.code === '42P01'; // PostgreSQL code for undefined_table
};

const throwIfError = (error: any, context: string) => {
  if (error) {
    console.error(`[Supabase Error - ${context}]:`, error);
    throw new Error(`Database error in ${context}: ${error.message}`);
  }
};

const getSupabaseAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
};

export interface SmartCardBox {
  id: string;
  numeroCaja: string;
  marca: string;
  modelo: string;
  cantidadObjetivo: number;
  requiereValidacion: boolean;
  estado: string;
  usuarioRegistro: string;
  createdAt: string;
}

export interface SmartCardItem {
  id: string;
  cajaId: string;
  seriePrincipal: string;
  materialSap?: string;
  estado: string;
  usuario: string;
  scannedAt: string;
}

export const createSmartCardBox = async (payload: {
  numeroCaja: string;
  marca: string;
  modelo: string;
  cantidadObjetivo: number;
  requiereValidacion: boolean;
  usuarioRegistro: string;
}) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('smartcard_cajas')
    .insert({
      numero_caja: payload.numeroCaja,
      marca: payload.marca,
      modelo: payload.modelo,
      cantidad_objetivo: payload.cantidadObjetivo,
      requiere_validacion: payload.requiereValidacion,
      estado: 'En Proceso',
      usuario_registro: payload.usuarioRegistro,
    })
    .select('*')
    .single();

  throwIfError(error, 'createSmartCardBox');
  return data;
};

export const getSmartCardBox = async (cajaId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('smartcard_cajas')
    .select('*')
    .eq('id', cajaId)
    .single();

  if (error && isMissingTableError(error)) return null;
  throwIfError(error, 'getSmartCardBox');
  return data;
};

export const listSmartCardBoxes = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('smartcard_cajas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'listSmartCardBoxes');
  return data;
};

export const addSmartCardItem = async (payload: {
  cajaId: string;
  seriePrincipal: string;
  materialSap?: string;
  usuario: string;
}) => {
  const supabase = getSupabaseAdmin();
  // Verificar duplicados globales
  const { data: existing, error: errCheck } = await supabase
    .from('smartcard_caja_items')
    .select('caja_id')
    .eq('serie_principal', payload.seriePrincipal)
    .maybeSingle();

  if (errCheck && !isMissingTableError(errCheck)) throwIfError(errCheck, 'check duplicate smartcard');
  if (existing) {
    throw new Error(`La serie ${payload.seriePrincipal} ya se encuentra registrada en el sistema.`);
  }

  const { data, error } = await supabase
    .from('smartcard_caja_items')
    .insert({
      caja_id: payload.cajaId,
      serie_principal: payload.seriePrincipal,
      material_sap: payload.materialSap || null,
      estado: 'Validado',
      usuario: payload.usuario,
    })
    .select('*')
    .single();

  throwIfError(error, 'addSmartCardItem');
  return data;
};

export const listSmartCardItems = async (cajaId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('smartcard_caja_items')
    .select('*')
    .eq('caja_id', cajaId)
    .order('scanned_at', { ascending: false });

  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'listSmartCardItems');
  return data;
};

export const deleteSmartCardItem = async (itemId: string) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('smartcard_caja_items')
    .delete()
    .eq('id', itemId);

  throwIfError(error, 'deleteSmartCardItem');
  return true;
};

// Función para obtener modelos existentes de la tabla de cajas o catálogos
export const getAvailableSmartCardModels = async () => {
  const supabase = getSupabaseAdmin();
  try {
    // Intentar obtener de la misma tabla de cajas creadas
    const { data: cajas, error: err1 } = await supabase
      .from('smartcard_cajas')
      .select('modelo')
      .not('modelo', 'is', null);

    let modelList = new Set<string>();
    
    if (!err1 && cajas) {
      cajas.forEach(c => modelList.add(c.modelo));
    }

    // Agregar modelos comunes por defecto en caso de estar vacío
    if (modelList.size === 0) {
      ['H168N V3.3', 'F670L', 'B866V', 'SMARTCARD NAGRAVISIÓN', 'SMARTCARD'].forEach(m => modelList.add(m));
    }

    return Array.from(modelList);
  } catch (err) {
    return ['H168N V3.3', 'F670L', 'B866V', 'SMARTCARD NAGRAVISIÓN', 'SMARTCARD'];
  }
};

export const getAllSmartCardItemsForReport = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('smartcard_caja_items')
    .select(`
      *,
      caja:smartcard_cajas (
        numero_caja,
        marca,
        modelo
      )
    `)
    .order('scanned_at', { ascending: false });

  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'getAllSmartCardItemsForReport');
  return data;
};
