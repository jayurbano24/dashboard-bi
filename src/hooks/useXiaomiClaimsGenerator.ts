/**
 * Hook: useXiaomiClaimsGenerator
 * 
 * Provides interface to generate Xiaomi Claims from Orderry orders.
 * Includes error handling, loading state, and download functionality.
 */

import { useState, useCallback } from 'react';

export interface XiaomiClaimsGeneratorResult {
  success: boolean;
  statistics: {
    totalInput: number;
    xiaomiFiltered: number;
    transformed: number;
    errors: number;
  };
  rows: Record<string, string>[];
  errors?: Array<{ orderNumber: string; error: string }>;
  timestamp: string;
}

export function useXiaomiClaimsGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<XiaomiClaimsGeneratorResult | null>(null);

  const generateClaims = useCallback(
    async (orders?: Record<string, any>[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/claims/generate-xiaomi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: orders || [] }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: XiaomiClaimsGeneratorResult = await response.json();

        if (!data.success) {
          throw new Error(data.errors?.[0]?.error || 'Generation failed');
        }

        setResult(data);
        return data;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        setError(errorMsg);
        console.error('Xiaomi Claims generation error:', e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const downloadAsXlsx = useCallback(async () => {
    if (!result || !result.rows) {
      setError('No data to export');
      return;
    }

    try {
      // Dynamic import openpyxl equivalent via browser-based solution
      // For now, export as CSV-like format
      const xlsxContent = generateXlsxContent(result.rows);
      const blob = new Blob([xlsxContent], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `xiaomi_claims_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Download failed';
      setError(errorMsg);
      console.error('Download error:', e);
    }
  }, [result]);

  const downloadAsCsv = useCallback(() => {
    if (!result || !result.rows) {
      setError('No data to export');
      return;
    }

    try {
      const csvContent = generateCsvContent(result.rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `xiaomi_claims_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Download failed';
      setError(errorMsg);
      console.error('Download error:', e);
    }
  }, [result]);

  return {
    isLoading,
    error,
    result,
    generateClaims,
    downloadAsXlsx,
    downloadAsCsv,
  };
}

// Helper: Generate CSV content from rows
function generateCsvContent(rows: Record<string, string>[]): string {
  if (!rows || rows.length === 0) return '';

  // Get all unique keys
  const allKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  // CSV header
  const header = allKeys.map((key) => `"${key.replace(/"/g, '""')}"`).join(',');

  // CSV rows
  const dataRows = rows
    .map((row) =>
      allKeys
        .map((key) => {
          const value = (row[key] || '').toString();
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');

  return `${header}\n${dataRows}`;
}

// Helper: Generate minimal XLSX-like structure (simplified; use library in production)
function generateXlsxContent(rows: Record<string, string>[]): string {
  // For browser, this should use a proper library like xlsx
  // This is a placeholder; in production, use write-xlsx or similar
  return generateCsvContent(rows);
}
