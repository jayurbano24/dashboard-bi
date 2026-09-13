import type { BsdEquipo } from '../../types';

export type InventarioSapImportMeta = {
  id: string;
  filename: string | null;
  registrosTotales: number;
  registrosG945: number;
  materialesDetectados: number;
  cargadoEn: string;
  importedBy: string | null;
};

type InventarioGetResponse = {
  ok: boolean;
  import: InventarioSapImportMeta | null;
  equipos: BsdEquipo[];
  total: number;
  error?: string;
};

type InventarioPostResponse = {
  ok: boolean;
  import: InventarioSapImportMeta;
  total: number;
  error?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  let data: T & { error?: string };
  try {
    data = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error(
      response.status >= 500
        ? 'Error interno del servidor al guardar inventario SAP. Revise la consola del servidor.'
        : 'Respuesta inválida del servidor.',
    );
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `Error del servidor (${response.status}).`);
  }
  return data;
}

export async function fetchInventarioSap(): Promise<InventarioGetResponse> {
  const response = await fetch('/api/separacion-sap/inventario', { cache: 'no-store' });
  return parseJson<InventarioGetResponse>(response);
}

export async function guardarInventarioSapArchivo(file: File): Promise<InventarioPostResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/separacion-sap/inventario', {
    method: 'POST',
    body: formData,
  });

  return parseJson<InventarioPostResponse>(response);
}
