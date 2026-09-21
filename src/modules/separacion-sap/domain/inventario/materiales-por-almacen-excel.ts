import type { MaterialCantidadAlmacen } from './sap-inventory';

function filasExcel(filas: MaterialCantidadAlmacen[]) {
  return filas.map((f) => ({
    Bodega: f.centro,
    Almacén: f.almacen,
    'Material SAP': f.materialCodigo,
    'Texto Material': f.materialTexto,
    Cantidad: f.cantidad,
  }));
}

export async function buildMaterialesPorAlmacenExcelBuffer(
  filas: MaterialCantidadAlmacen[],
  hojaNombre: string,
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');

  const ws = XLSX.utils.json_to_sheet(filasExcel(filas));
  ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hojaNombre.slice(0, 31));
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export async function buildMaterialesPorAlmacenExcelBufferMultiHoja(
  porBodega: Map<string, MaterialCantidadAlmacen[]>,
  resumenFilas: MaterialCantidadAlmacen[],
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const wsResumen = XLSX.utils.json_to_sheet(filasExcel(resumenFilas));
  wsResumen['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Todas las bodegas');

  for (const [centro, filas] of porBodega) {
    if (filas.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(filasExcel(filas));
    ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, centro);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export function descargarMaterialesPorAlmacenExcel(nombreArchivo: string, buffer: ArrayBuffer) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombreArchivo;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportarMaterialesPorAlmacenBodega(
  filas: MaterialCantidadAlmacen[],
  centro: string,
): Promise<void> {
  if (filas.length === 0) return;
  const fecha = new Date().toISOString().slice(0, 10);
  const buffer = await buildMaterialesPorAlmacenExcelBuffer(filas, centro);
  descargarMaterialesPorAlmacenExcel(`materiales-por-almacen-${centro}-${fecha}.xlsx`, buffer);
}

export async function exportarMaterialesPorAlmacenTodasBodegas(
  resumenFilas: MaterialCantidadAlmacen[],
  porBodega: Map<string, MaterialCantidadAlmacen[]>,
): Promise<void> {
  if (resumenFilas.length === 0) return;
  const fecha = new Date().toISOString().slice(0, 10);
  const buffer = await buildMaterialesPorAlmacenExcelBufferMultiHoja(porBodega, resumenFilas);
  descargarMaterialesPorAlmacenExcel(`materiales-por-almacen-todas-bodegas-${fecha}.xlsx`, buffer);
}
