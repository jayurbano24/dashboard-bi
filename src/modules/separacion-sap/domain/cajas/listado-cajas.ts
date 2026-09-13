import { resumenMaterialesCaja, resumenSubgruposCaja } from './caja-utils';
import type { CajaEntidad, EstadoCaja } from '../../types';

export const CAJAS_POR_PAGINA = 25;

export type FiltrosColumnaCajas = {
  numeroCaja: Set<string>;
  fechaCreacion: Set<string>;
  creadoPor: Set<string>;
  centro: Set<string>;
  marcaModelo: Set<string>;
  materialSap: Set<string>;
  estado: Set<string>;
};

export function filtrosColumnaVacios(): FiltrosColumnaCajas {
  return {
    numeroCaja: new Set(),
    fechaCreacion: new Set(),
    creadoPor: new Set(),
    centro: new Set(),
    marcaModelo: new Set(),
    materialSap: new Set(),
    estado: new Set(),
  };
}

export function etiquetaCreadoPor(caja: CajaEntidad): string {
  return caja.createdBy?.trim() || '—';
}

export function formatFechaCaja(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Caja activa en captura primero; luego abiertas; después por fecha de creación descendente. */
export function ordenarCajasParaListado(cajas: CajaEntidad[], cajaActivaId: string | null): CajaEntidad[] {
  return [...cajas].sort((a, b) => {
    if (cajaActivaId) {
      if (a.id === cajaActivaId) return -1;
      if (b.id === cajaActivaId) return 1;
    }

    const prioEstado = (estado: EstadoCaja) =>
      estado === 'ABIERTA' ? 0 : estado === 'CERRADA' ? 1 : 2;
    const diffEstado = prioEstado(a.estado) - prioEstado(b.estado);
    if (diffEstado !== 0) return diffEstado;

    return new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime();
  });
}

function pasaFiltroSet<T>(valor: T, seleccion: Set<T>): boolean {
  return seleccion.size === 0 || seleccion.has(valor);
}

export function aplicarFiltrosColumnaCajas(
  cajas: CajaEntidad[],
  filtros: FiltrosColumnaCajas,
): CajaEntidad[] {
  return cajas.filter((c) => {
    const marcaModelo = resumenSubgruposCaja(c);
    const material = resumenMaterialesCaja(c);
    return (
      pasaFiltroSet(c.numeroCaja, filtros.numeroCaja) &&
      pasaFiltroSet(formatFechaCaja(c.creadaEn), filtros.fechaCreacion) &&
      pasaFiltroSet(etiquetaCreadoPor(c), filtros.creadoPor) &&
      pasaFiltroSet(c.centro, filtros.centro) &&
      pasaFiltroSet(marcaModelo, filtros.marcaModelo) &&
      pasaFiltroSet(material, filtros.materialSap) &&
      pasaFiltroSet(c.estado, filtros.estado)
    );
  });
}

export function opcionesUnicasColumna(
  cajas: CajaEntidad[],
  columna: keyof FiltrosColumnaCajas,
): string[] {
  const valores = new Set<string>();

  for (const c of cajas) {
    switch (columna) {
      case 'numeroCaja':
        valores.add(c.numeroCaja);
        break;
      case 'fechaCreacion':
        valores.add(formatFechaCaja(c.creadaEn));
        break;
      case 'centro':
        valores.add(c.centro);
        break;
      case 'creadoPor':
        valores.add(etiquetaCreadoPor(c));
        break;
      case 'marcaModelo':
        valores.add(resumenSubgruposCaja(c));
        break;
      case 'materialSap':
        valores.add(resumenMaterialesCaja(c));
        break;
      case 'estado':
        valores.add(c.estado);
        break;
    }
  }

  return Array.from(valores).sort((a, b) => a.localeCompare(b, 'es'));
}

export function paginarCajas<T>(items: T[], pagina: number, porPagina = CAJAS_POR_PAGINA): T[] {
  const inicio = (pagina - 1) * porPagina;
  return items.slice(inicio, inicio + porPagina);
}

export function totalPaginasCajas(total: number, porPagina = CAJAS_POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina));
}
