'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Download,
  Trash2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SmartCardReportPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/despacho/smartcard?action=report');
      const data = await res.json();
      if (data.ok) {
        setReportData(data.data);
      } else {
        setErrorMsg(data.error || 'Error al cargar el reporte');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEliminarItem = async (itemId: string) => {
    if (!confirm('¿Seguro que desea eliminar este registro?')) return;
    try {
      const res = await fetch(`/api/despacho/smartcard?id=${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setReportData(reportData.filter(i => i.id !== itemId));
      } else {
        alert(data.error || 'Error al eliminar');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const exportToExcel = () => {
    if (reportData.length === 0) return;

    const dataToExport = reportData.map(item => ({
      'Fecha': formatDate(item.scanned_at),
      'Caja': item.caja?.numero_caja || '-',
      'Marca': item.caja?.marca || '-',
      'Modelo': item.caja?.modelo || '-',
      'Material': item.material_sap || '-',
      'Serie SAP / Principal': item.serie_principal,
      'Series Adicionales': '-',
      'Usuario': item.usuario,
      'Estado': item.estado,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte SmartCard");
    XLSX.writeFile(wb, `Reporte_SmartCard_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/despacho/smartcard" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Reporte General - Cajas SMART CARD
            </h1>
            <p className="text-sm text-slate-500 font-medium">Historial detallado de todas las series escaneadas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            disabled={reportData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 flex flex-col gap-6">
        {errorMsg && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Detalle de Series Ingresadas</h3>
            <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-600 shadow-sm">
              {reportData.length} registros
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Caja</th>
                  <th className="px-5 py-4">Marca</th>
                  <th className="px-5 py-4">Modelo</th>
                  <th className="px-5 py-4">Material</th>
                  <th className="px-5 py-4">Serie SAP / Principal</th>
                  <th className="px-5 py-4">Series Adicionales</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Cargando datos...
                    </td>
                  </tr>
                ) : reportData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No hay registros disponibles.
                    </td>
                  </tr>
                ) : (
                  reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(item.scanned_at)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 whitespace-nowrap">
                        {item.caja?.numero_caja || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {item.caja?.marca || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {item.caja?.modelo || '-'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-blue-600">
                        {item.material_sap || '-'}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                        {item.serie_principal}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        -
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {item.usuario}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button 
                          onClick={() => handleEliminarItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                          title="Eliminar serie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
