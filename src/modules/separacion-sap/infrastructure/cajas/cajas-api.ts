import type {
  CapturaSerie,
  CajaEntidad,
  CrearSubgrupoInput,
  EstadoCaja,
  TipoProductoId,
  ValoracionSubgrupo,
} from '../../types';

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data?.error ?? `Error del servidor (${response.status}).`);
  }
  return data;
}

export type CajasGetResponse = {
  ok: true;
  cajas: CajaEntidad[];
  secuenciaCaja: number;
};

export async function fetchCajasSeparacionSap(): Promise<CajasGetResponse> {
  const response = await fetch('/api/separacion-sap/cajas', { cache: 'no-store' });
  return parseJson<CajasGetResponse>(response);
}

export type CrearCajaPayload = {
  centro: string;
  almacen: string;
  observaciones?: string;
  /** Omitir o [] para flujo guiado (caja vacía). */
  subgrupos?: CrearSubgrupoInput[];
};

export async function crearCajaSeparacionSap(payload: CrearCajaPayload): Promise<{ ok: true; caja: CajaEntidad }> {
  const response = await fetch('/api/separacion-sap/cajas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function registrarCapturaSeparacionSap(
  cajaId: string,
  captura: CapturaSerie,
): Promise<{ ok: true; captura: CapturaSerie; caja: CajaEntidad }> {
  const response = await fetch(`/api/separacion-sap/cajas/${cajaId}/capturas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(captura),
  });
  return parseJson(response);
}

export async function actualizarSubgruposCajaSeparacionSap(
  cajaId: string,
  subgrupos: Array<CrearSubgrupoInput & { id?: string }>,
): Promise<{ ok: true; caja: CajaEntidad }> {
  const response = await fetch(`/api/separacion-sap/cajas/${cajaId}/subgrupos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subgrupos }),
  });
  return parseJson(response);
}

export async function eliminarSubgrupoCajaSeparacionSap(
  cajaId: string,
  subgrupoId: string,
): Promise<{ ok: true; caja: CajaEntidad }> {
  const response = await fetch(`/api/separacion-sap/cajas/${cajaId}/subgrupos/${subgrupoId}`, {
    method: 'DELETE',
  });
  return parseJson(response);
}

export async function fetchCentrosSap(): Promise<{ ok: true; centros: string[] }> {
  const response = await fetch('/api/separacion-sap/centros', { cache: 'no-store' });
  return parseJson(response);
}

export type SerieLookupResponse =
  | {
      ok: true;
      lookup: {
        normalizedSerial: string;
        materialCodigo: string;
        materialTexto: string;
        centro: string;
        almacen: string;
        lote: string;
        statusSistema: string;
        valoracion: ValoracionSubgrupo;
        cantidadDisponibleSap: number;
        marcaInferida: string;
        modeloInferido: string;
        longitudDigitos: number;
      };
    }
  | { ok: false; error: string; code?: string };

export async function lookupSerieSap(params: {
  serial: string;
  centroCaja: string;
  cajaId?: string;
}): Promise<SerieLookupResponse> {
  const response = await fetch('/api/separacion-sap/series/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await response.json()) as SerieLookupResponse & { error?: string; code?: string };
  if (!response.ok) {
    return { ok: false, error: data.error ?? `Error (${response.status})`, code: data.code };
  }
  return data as SerieLookupResponse;
}

export type CrearSubgrupoGuiadoPayload = {
  tipoProducto: TipoProductoId;
  cantidadEsperada: number;
  marca: string;
  modelo: string;
  materialCodigo: string;
  materialTexto: string;
  longitudDigitos: number;
  valoracion: ValoracionSubgrupo;
  cantidadDisponibleSap: number;
  primeraSerie: {
    normalizedSerial: string;
    almacen: string;
    lote: string;
    statusBsd: string;
    statusCaptura: string;
  };
};

export async function crearSubgrupoGuiadoSeparacionSap(
  cajaId: string,
  payload: CrearSubgrupoGuiadoPayload,
): Promise<{ ok: true; caja: CajaEntidad; subgrupoId: string }> {
  const response = await fetch(`/api/separacion-sap/cajas/${cajaId}/subgrupos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function eliminarCajaSeparacionSap(
  cajaId: string,
): Promise<{ ok: true; id: string; numeroCaja: string }> {
  const response = await fetch(`/api/separacion-sap/cajas/${cajaId}`, { method: 'DELETE' });
  return parseJson(response);
}

export async function actualizarEstadoCajaSeparacionSap(
  cajaId: string,
  estado: EstadoCaja,
  extras?: { ubicacion?: string; tarima?: string },
): Promise<{ ok: true; caja: CajaEntidad }> {
  const response = await fetch(`/api/separacion-sap/cajas/${cajaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, ...extras }),
  });
  return parseJson(response);
}
