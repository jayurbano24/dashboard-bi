import type { SeriePendienteBodega } from './inventario-bodega';

export async function buildSeriesPendientesExcelBuffer(
  bodega: string,
  series: SeriePendienteBodega[],
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');

  const rows = series.map((s) => ({
    Centro: s.centro,
    'Material SAP': s.materialCodigo,
    'Texto Material': s.materialTexto,
    Serie: s.normalizedSerial,
    Almacén: s.almacen,
    Lote: s.lote,
    'Status SAP': s.statusSistema,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 36 },
    { wch: 20 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Pendientes ${bodega}`);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export function descargarSeriesPendientesExcel(bodega: string, buffer: ArrayBuffer, total: number) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `series-pendientes-${bodega}-${total}uds-${fecha}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportarSeriesPendientesBodega(
  bodega: string,
  series: SeriePendienteBodega[],
): Promise<void> {
  if (series.length === 0) return;
  const buffer = await buildSeriesPendientesExcelBuffer(bodega, series);
  descargarSeriesPendientesExcel(bodega, buffer, series.length);
}
