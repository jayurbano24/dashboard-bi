import { NextResponse } from 'next/server';
import {
  deduplicateReportRowsByOrder,
  getDespachoReportRows,
  getHistorialEstadoFechasPorOrdenes,
  getHistorialOrigenByOrders,
} from '@/lib/supabase-store';
import { ReportingEngine } from '@/lib/reporting-engine';
import { GenerateClaroReportUseCase } from '@/modules/report-engine/application/GenerateClaroReportUseCase';
import { GenerateHistorialMovimientosUseCase } from '@/modules/report-engine/application/GenerateHistorialMovimientosUseCase';
import { HistorialMovimientosTemplateEngine } from '@/modules/report-engine/domain/HistorialMovimientosTemplateEngine';
import { ExcelExporter } from '@/modules/report-engine/infrastructure/ExcelExporter';
import { REPORT_TEMPLATE_HISTORIAL_MOVIMIENTOS } from '@/modules/report-engine/shared/historial-config';
import {
  fetchPronetOrdersFromOrderry,
  mergePronetReportRows,
} from '@/lib/orderry/fetch-pronet-orders';
import { enrichReportRowsFromOrderry } from '@/lib/orderry-order-snapshot';
import { GenerateServitotalReportUseCase } from '@/modules/report-engine/application/GenerateServitotalReportUseCase';
import { ServitotalTemplateEngine } from '@/modules/report-engine/domain/ServitotalTemplateEngine';
import { GeneratePronetReportUseCase } from '@/modules/report-engine/application/GeneratePronetReportUseCase';
import { PronetTemplateEngine } from '@/modules/report-engine/domain/PronetTemplateEngine';
import {
  getPronetMarkers,
  isPronetOrder,
  REPORT_TEMPLATE_PRONET,
} from '@/modules/report-engine/shared/pronet-config';
import {
  isServitotalClient,
  REPORT_TEMPLATE_SERVITOTAL,
} from '@/modules/report-engine/shared/servitotal-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const searchTerm = searchParams.get('searchTerm') || undefined;
    const dealer = searchParams.get('dealer') || undefined;
    const courrier = searchParams.get('courrier') || undefined;
    const marca = searchParams.get('marca') || undefined;
    const modelo = searchParams.get('modelo') || undefined;
    const doa = searchParams.get('doa') || undefined;

    const template = searchParams.get('template') || undefined;
    const region = (searchParams.get('region') || 'TODOS') as 'TODOS' | 'GAM' | 'NO GAM';
    const formatParam = searchParams.get('format') || 'json';

    const isPartnerTemplate =
      template === REPORT_TEMPLATE_PRONET || template === REPORT_TEMPLATE_SERVITOTAL;

    // Plantillas partner: filtrar por created_at de la orden, no por fecha de conduce.
    const rows = await getDespachoReportRows({
      startDate: isPartnerTemplate ? undefined : startDate,
      endDate: isPartnerTemplate ? undefined : endDate,
      searchTerm,
      dealer,
      courrier,
      marca,
      modelo,
      doa,
    });

    const filterRowsByOrderCreatedAt = <T extends { created_at?: string | null }>(list: T[]): T[] => {
      if (!isPartnerTemplate) return list;
      return list.filter((row) => {
        const day = String(row.created_at ?? '').slice(0, 10);
        if (!day) return true;
        if (startDate && day < startDate) return false;
        if (endDate && day > endDate) return false;
        return true;
      });
    };

    if (template === REPORT_TEMPLATE_HISTORIAL_MOVIMIENTOS) {
      const engine = new ReportingEngine();
      const filteredRows = engine.filterByRegion(rows as any[], region);
      const dedupedRows = deduplicateReportRowsByOrder(filteredRows);

      const orderIds = dedupedRows
        .map((row) => (row.orderId ? String(row.orderId) : ''))
        .filter(Boolean);

      const [historialByOrder, historialOrigenByOrder] = await Promise.all([
        getHistorialEstadoFechasPorOrdenes(orderIds),
        getHistorialOrigenByOrders(orderIds),
      ]);
      const useCase = new GenerateHistorialMovimientosUseCase();
      const finalReport = useCase.execute(dedupedRows as any[], historialByOrder, historialOrigenByOrder);

      if (formatParam === 'csv' || formatParam === 'xlsx') {
        const columns = HistorialMovimientosTemplateEngine.getColumns() as string[];
        const exporter = new ExcelExporter();
        const buffer = exporter.exportRowsToBuffer(finalReport, columns, 'Historial Estados');

        return new Response(buffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Reporte_HISTORIAL_MOVIMIENTOS_${new Date().toISOString().slice(0, 10)}.xlsx"`,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        count: finalReport.length,
        rows: finalReport,
        dataSource: 'supabase_sync',
      });
    }

    if (template === REPORT_TEMPLATE_SERVITOTAL) {
      const dedupedRows = deduplicateReportRowsByOrder(filterRowsByOrderCreatedAt(rows));
      const servitotalRows = dedupedRows.filter((row) =>
        isServitotalClient(String(row.cliente || '')),
      );

      await enrichReportRowsFromOrderry(servitotalRows as Record<string, unknown>[], {
        maxFetches: 200,
        concurrency: 10,
      });

      const servitotalOrderIds = servitotalRows
        .map((row) => (row.orderId ? String(row.orderId) : ''))
        .filter(Boolean);

      const historialByOrder = await getHistorialEstadoFechasPorOrdenes(servitotalOrderIds);

      const useCase = new GenerateServitotalReportUseCase();
      const finalReport = useCase.execute(
        servitotalRows as Parameters<typeof useCase.execute>[0],
        historialByOrder,
      );

      if (formatParam === 'csv' || formatParam === 'xlsx') {
        const columns = ServitotalTemplateEngine.getColumns() as string[];
        const exporter = new ExcelExporter();
        const buffer = exporter.exportRowsToBuffer(finalReport, columns, 'Servitotal');

        return new Response(buffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Reporte_SERVITOTAL_${new Date().toISOString().slice(0, 10)}.xlsx"`,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        count: finalReport.length,
        rows: finalReport,
        dataSource: 'supabase_sync',
      });
    }

    if (template === REPORT_TEMPLATE_PRONET) {
      const dedupedRows = deduplicateReportRowsByOrder(filterRowsByOrderCreatedAt(rows));
      const pronetFromSupabase = dedupedRows.filter((row) => isPronetOrder(row));

      // Si Supabase ya tiene órdenes PRONET, no escanear miles de páginas en Orderry.
      const orderryFetch =
        pronetFromSupabase.length > 0
          ? { rows: [], scannedPages: 0, scannedOrders: 0, matchedOrders: 0 }
          : await fetchPronetOrdersFromOrderry({
              startDate,
              endDate,
              maxPages: 20,
              lookbackDays: 365,
            });

      const pronetRows = mergePronetReportRows(
        pronetFromSupabase as Parameters<typeof mergePronetReportRows>[0],
        orderryFetch.rows,
      );

      await enrichReportRowsFromOrderry(pronetRows as Record<string, unknown>[], {
        maxFetches: 80,
        concurrency: 12,
        allWithOrderId: true,
      });

      const useCase = new GeneratePronetReportUseCase();
      const finalReport = useCase.execute(pronetRows as Parameters<typeof useCase.execute>[0]);

      if (formatParam === 'csv' || formatParam === 'xlsx') {
        const columns = PronetTemplateEngine.getColumns() as string[];
        const exporter = new ExcelExporter();
        const buffer = exporter.exportRowsToBuffer(finalReport, columns, 'Pronet');

        return new Response(buffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Reporte_PRONET_${new Date().toISOString().slice(0, 10)}.xlsx"`,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        count: finalReport.length,
        rows: finalReport,
        dataSource: 'supabase_sync+orderry_list',
        meta: {
          supabaseMatches: pronetFromSupabase.length,
          orderryMatches: orderryFetch.matchedOrders,
          orderryScanned: orderryFetch.scannedOrders,
          orderryPages: orderryFetch.scannedPages,
          markers: getPronetMarkers(),
        },
        hint:
          finalReport.length === 0
            ? `No hay órdenes con CANAL DE INGRESO ${getPronetMarkers().join(' / ')} en Supabase ni en Orderry. Amplíe el rango de fechas o verifique PRONET_REPORT_MARKERS en .env.local.`
            : undefined,
      });
    }

    if (template === 'PLANTILLA_CLARO_MENSUAL') {
      const claroRows = rows as Array<{ orderId?: number | null; orderName?: string }>;
      const claroOrderIds = claroRows
        .map((row) => (row.orderId ? String(row.orderId) : ''))
        .filter(Boolean);

      const [historialByOrder, historialOrigenByOrder] = await Promise.all([
        getHistorialEstadoFechasPorOrdenes(claroOrderIds),
        getHistorialOrigenByOrders(claroOrderIds),
      ]);

      const useCase = new GenerateClaroReportUseCase();
      const { report, logs } = useCase.execute(
        rows as any[],
        historialByOrder,
        historialOrigenByOrder,
      );

      let finalReport = report;
      if (region !== 'TODOS') {
        finalReport = report.filter((r) => r['GAM / NO GAM'] === region);
      }

      if (formatParam === 'csv' || formatParam === 'xlsx') {
        const exporter = new ExcelExporter();
        const buffer = exporter.exportToBuffer(finalReport);
        
        return new Response(buffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Reporte_CLARO_MENSUAL_${new Date().toISOString().slice(0, 10)}.xlsx"`,
          },
        });
      }

      return NextResponse.json({ ok: true, count: finalReport.length, rows: finalReport, logs });
    }

    if (template) {
      const engine = new ReportingEngine();
      const processedRows = engine.process(rows as any[], template, region);

      if (formatParam === 'xlsx') {
        const XLSX = require('xlsx');
        const worksheet = XLSX.utils.json_to_sheet(processedRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        return new Response(buffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Reporte_${template}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
          },
        });
      } else if (formatParam === 'csv') {
        const csvContent = jsonToCsv(processedRows);
        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="Reporte_${template}_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({ ok: true, count: processedRows.length, rows: processedRows });
    }

    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al generar reporte de despachos.' }, { status: 500 });
  }
}

function jsonToCsv(jsonArray: Record<string, any>[]): string {
  if (jsonArray.length === 0) return '';
  const headers = Object.keys(jsonArray[0]);
  const csvRows = [headers.join(',')];
  for (const row of jsonArray) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = String(val !== undefined && val !== null ? val : '').replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return '\ufeff' + csvRows.join('\r\n');
}
