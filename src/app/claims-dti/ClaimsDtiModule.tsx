'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Title, Text, Button, Badge, Flex, Grid, Metric } from '@tremor/react';
import { 
  processOrderryRawData, 
  exportClaimsToExcelWorkbook, 
  ProcessedClaim, 
  CLAIMS_HEADERS_64,
  getClaimRowValues,
  FORCE_CACHE_INVALIDATION
} from '@/modules/claims-distesa/ClaimsEngineDistesa';
// Imports de Tanstack removidos para evitar el error de Module Not Found
type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export default function ClaimsDtiModule() {
  const [isFetching, setIsFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedClaims, setProcessedClaims] = useState<ProcessedClaim[]>([]);
  const [rawFilteredData, setRawFilteredData] = useState<any[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  // Add date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleFetchAndProcess = async () => {
    console.log('[DEBUG] 1. Botón clickeado. Iniciando proceso...');
    setIsFetching(true);
    setHasProcessed(false);
    
    // Safety timeout to unblock UI if something completely hangs
    const safetyTimeout = setTimeout(() => {
      console.error('[DEBUG-ERROR] Safety Timeout activado tras 5 minutos. La base de datos está tardando demasiado.');
      setIsFetching(false);
      setIsProcessing(false);
    }, 300000);

    try {
      console.log(`[DEBUG] 2. Disparando fetch a /api/claims-distesa?startDate=${startDate}&endDate=${endDate}`);
      const response = await fetch(`/api/claims-distesa?startDate=${startDate}&endDate=${endDate}`);
      
      console.log(`[DEBUG] 3. Fetch completado con status: ${response.status}. Parseando JSON...`);
      const data = await response.json();
      
      console.log('[DEBUG] 4. JSON parseado exitosamente:', data?.ok, 'Filas recibidas:', data?.count);
      if (!data || !data.ok || !data.rows) {
        throw new Error('No se pudo cargar la información de despachos. Data inválida.');
      }

      console.log('[DEBUG] 5. Mapeando rawOrderryData...');
      const rawOrderryData = data.rows
        .map((r: any) => r.rawRecord)
        .filter((raw: any) => raw && Object.keys(raw).length > 0);

      console.log(`[DEBUG] 6. rawOrderryData filtrado. Elementos: ${rawOrderryData.length}`);
      if (rawOrderryData.length === 0) {
        console.warn('[DEBUG] ADVERTENCIA: No se encontró data de Orderry en los registros.');
      }
      setRawFilteredData(rawOrderryData);

      setIsProcessing(true);
      console.log('[DEBUG] 7. Ejecutando Motor Matemático V2 (Filtros Ecosistema DESACTIVADOS)... Cache ID:', FORCE_CACHE_INVALIDATION);
      
      const claims = processOrderryRawData(rawOrderryData);
      
      console.log(`[DEBUG] 8. Motor completado exitosamente. Claims procesados: ${claims.length}`);
      setProcessedClaims(claims);
      setHasProcessed(true);

      console.log('[DEBUG] 9. Proceso completo.');
    } catch (error) {
      console.error('[DEBUG-ERROR] Error crítico durante el proceso:', error);
      alert('Error al obtener o procesar los datos. Revisa la consola (F12) para más detalles.');
    } finally {
      clearTimeout(safetyTimeout);
      console.log('[DEBUG] 10. Apagando spinners en finally...');
      setIsFetching(false);
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!processedClaims.length) return;
    try {
      const blob = await exportClaimsToExcelWorkbook(processedClaims, rawFilteredData) as Blob;
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Claims_DISTESA_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Hubo un error al generar el archivo Excel.');
    }
  };

  // Convert ProcessedClaims into the exact 64-column format for the Table
  const tableData = useMemo(() => {
    return processedClaims.map(claim => getClaimRowValues(claim));
  }, [processedClaims]);

  // Native Table State
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Convert ProcessedClaims into the exact 64-column format for the Table
  const rawTableData = useMemo(() => {
    return processedClaims.map(claim => getClaimRowValues(claim));
  }, [processedClaims]);

  // Handle Sorting
  const sortedData = useMemo(() => {
    let sortableItems = [...rawTableData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = String(a[sortConfig.key] || '');
        const bVal = String(b[sortConfig.key] || '');
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [rawTableData, sortConfig]);

  // Handle Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalClaimAmount = processedClaims.reduce((sum, claim) => sum + claim.totalClaim, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title className="text-3xl text-[#1E4D2B] font-bold">Claims Engine · DISTESA Ecosistemas</Title>
            <Text className="text-slate-500">
              Generador automatizado de claims y billing parameters para el contrato DISTESA Ecosistemas.
            </Text>
          </div>
          <a
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm"
          >
            ← Volver al Dashboard General
          </a>
        </div>

        {/* Date Filter & Actions */}
        <Card>
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Inicio</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="p-2 border rounded-md text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Fin</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="p-2 border rounded-md text-sm" 
              />
            </div>
            <Button
              size="lg"
              color="emerald"
              onClick={handleFetchAndProcess}
              loading={isFetching || isProcessing}
            >
              Extraer y Procesar Claims
            </Button>
            
            {hasProcessed && (
              <Button
                size="lg"
                color="blue"
                variant="secondary"
                onClick={handleDownloadExcel}
                disabled={processedClaims.length === 0}
              >
                Descargar Plantilla Oficial (.xlsx)
              </Button>
            )}
          </div>
        </Card>

        {hasProcessed && (
          <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
            <Card decoration="top" decorationColor="blue">
              <Text>Total de Órdenes Evaluadas</Text>
              <Metric>{rawFilteredData.length}</Metric>
            </Card>
            <Card decoration="top" decorationColor="emerald">
              <Text>Claims (Ecosistema)</Text>
              <Metric>{processedClaims.length}</Metric>
              <Text className="text-xs text-slate-400 mt-1">Excluye celulares/tablets y canales externos</Text>
            </Card>
            <Card decoration="top" decorationColor="amber">
              <Text>Monto Total (Total Claim)</Text>
              <Metric>Q {totalClaimAmount.toFixed(2)}</Metric>
              <Text className="text-xs text-slate-400 mt-1">Incluye IVA (12%)</Text>
            </Card>
          </Grid>
        )}

        {hasProcessed && (
          <Card className="mt-6 overflow-hidden border-t-4 border-t-emerald-500 shadow-sm">
            <Title className="mb-4 text-[#1E4D2B]">Vista Previa: Estructura Completa de 64 Columnas</Title>
            
            {processedClaims.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 border border-dashed rounded-lg">
                <p className="font-semibold text-lg">0 Claims generados</p>
                <p className="text-sm">Las {rawFilteredData.length} órdenes evaluadas en este rango de fechas fueron excluidas por los filtros de Ecosistema (ej. son celulares, tablets o de otro canal).</p>
                <p className="text-sm mt-2">Intenta seleccionar un rango de fechas donde sepas que hay scooters, robots, o reparaciones de Xiaomi/Distesa.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg bg-white custom-scrollbar" style={{ maxHeight: '600px' }}>
                <table className="min-w-max w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {CLAIMS_HEADERS_64.map((header) => (
                        <th 
                          key={header} 
                          className="px-4 py-3 font-semibold border-b border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                          onClick={() => requestSort(header)}
                        >
                          <div className="flex items-center gap-2">
                            {header}
                            {sortConfig?.key === header ? (
                              <span className="text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                            ) : (
                              <span className="text-xs text-slate-300">↕</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {paginatedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        {CLAIMS_HEADERS_64.map((header) => (
                          <td key={header} className="px-4 py-2 border-r border-slate-100 whitespace-nowrap">
                            <div className="truncate max-w-[200px]" title={String(row[header] || '')}>
                              {row[header] !== undefined && row[header] !== null ? String(row[header]) : ''}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-slate-500">
                Página {currentPage} de {totalPages} 
                {' '}({sortedData.length} registros totales)
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="xs" 
                  variant="secondary" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button 
                  size="xs" 
                  variant="secondary" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded p-1 text-sm bg-white text-slate-700 ml-4"
                >
                  {[10, 50, 100].map(size => (
                    <option key={size} value={size}>
                      Mostrar {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
