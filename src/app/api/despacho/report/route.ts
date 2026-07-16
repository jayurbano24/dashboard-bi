import { NextResponse } from 'next/server';
import { getDespachoReportRows } from '@/lib/supabase-store';
import { ReportingEngine } from '@/lib/reporting-engine';
import { GenerateClaroReportUseCase } from '@/modules/report-engine/application/GenerateClaroReportUseCase';
import { ExcelExporter } from '@/modules/report-engine/infrastructure/ExcelExporter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const rows = await getDespachoReportRows({
      startDate,
      endDate,
      searchTerm,
      dealer,
      courrier,
      marca,
      modelo,
      doa,
    });

    if (template === 'PLANTILLA_CLARO_MENSUAL') {
      const useCase = new GenerateClaroReportUseCase();
      const { report, logs } = useCase.execute(rows as any[]);
      
      let finalReport = report;
      if (region !== 'TODOS') {
        finalReport = report.filter(r => r['GAM / NO GAM'] === region);
      }

      if (formatParam === 'csv' || formatParam === 'xlsx') {
        const exporter = new ExcelExporter();
        const buffer = exporter.exportToBuffer(finalReport);
        
        return new Response(buffer, {
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

      if (formatParam === 'csv' || formatParam === 'xlsx') {
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
