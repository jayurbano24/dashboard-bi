import { CENTROS_AUTORIZADOS, ESTADOS_CAJA } from '../shared/constants';
import type { CajaEntidad, CajaSubgrupo, CrearSubgrupoInput } from '../../types';

export function crearCajaEntidad(input: {
  id: string;
  numeroCaja: string;
  centro: string;
  almacen: string;
  observaciones?: string;
  createdBy?: string | null;
  subgrupos?: CrearSubgrupoInput[];
}): CajaEntidad {
  const lineas = input.subgrupos ?? [];
  if (!CENTROS_AUTORIZADOS.includes(input.centro as (typeof CENTROS_AUTORIZADOS)[number])) {
    throw new Error('Centro inválido.');
  }
  for (const sg of lineas) {
    if (sg.cantidadEsperada <= 0) {
      throw new Error('La cantidad esperada debe ser mayor a 0 en cada Sub-Grupo.');
    }
    if (!sg.materialCodigo.trim()) {
      throw new Error('Cada Sub-Grupo requiere un material SAP.');
    }
  }

  const subgrupos: CajaSubgrupo[] = lineas.map((sg, index) => ({
    id: `sg-${input.id}-${index}`,
    marca: sg.marca,
    modelo: sg.modelo,
    tipoProducto: sg.tipoProducto,
    materialCodigo: sg.materialCodigo,
    materialTexto: sg.materialTexto,
    cantidadEsperada: Number(sg.cantidadEsperada),
    cantidadCapturada: 0,
    longitudDigitos: Number(sg.longitudDigitos) || 15,
    esquemaSeries: sg.esquemaSeries || 'S1',
    estado: 'EN_PROGRESO',
    valoracion: null,
    cantidadDisponibleSap: null,
  }));

  return {
    id: input.id,
    numeroCaja: input.numeroCaja,
    centro: input.centro,
    almacen: input.almacen,
    estado: ESTADOS_CAJA.ABIERTA,
    ubicacion: '',
    tarima: '',
    observaciones: input.observaciones || '',
    creadaEn: new Date().toISOString(),
    cerradaEn: null,
    despachadaEn: null,
    createdBy: input.createdBy ?? null,
    subgrupos,
    capturas: [],
  };
}
