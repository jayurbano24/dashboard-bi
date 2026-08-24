'use client';

import * as XLSX from 'xlsx';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Settings,
  AlertCircle,
  Check,
  ArrowLeft,
  Upload,
} from 'lucide-react';

interface SmartCardBox {
  id: string;
  numero_caja: string;
  marca: string;
  modelo: string;
  cantidad_objetivo: number;
  requiere_validacion: boolean;
  estado: string;
  usuario_registro: string;
}

interface SmartCardItem {
  id: string;
  caja_id: string;
  serie_principal: string;
  material_sap?: string;
  estado: string;
  usuario: string;
  scanned_at: string;
}

interface BaseItem {
  serie: string;
  material: string;
}

export default function SmartCardBoxPage() {
  const router = useRouter();
  
  // Catálogos
  const [modelosDisponibles, setModelosDisponibles] = useState<string[]>([]);
  const [modelosLoading, setModelosLoading] = useState(true);

  // Estados de Creación de Caja
  const [modeloSeleccionado, setModeloSeleccionado] = useState('');
  const [cantidadObjetivo, setCantidadObjetivo] = useState<number | ''>(50);
  const [requiereValidacion, setRequiereValidacion] = useState(false);
  const [archivoBase, setArchivoBase] = useState<File | null>(null);
  const [baseCargada, setBaseCargada] = useState<BaseItem[]>([]);
  
  // Estado de Caja Activa
  const [cajaActiva, setCajaActiva] = useState<SmartCardBox | null>(null);
  const [cajaLoading, setCajaLoading] = useState(false);
  const [itemsEscaneados, setItemsEscaneados] = useState<SmartCardItem[]>([]);

  // Escáner
  const serieInputRef = useRef<HTMLInputElement>(null);
  const [serieInput, setSerieInput] = useState('');
  const [scanMessage, setScanMessage] = useState({ text: '', type: '' });
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchModelos();
  }, []);

  const fetchModelos = async () => {
    try {
      const res = await fetch('/api/despacho/smartcard?action=models');
      const data = await res.json();
      if (data.ok) {
        setModelosDisponibles(data.data);
        if (data.data.length > 0) setModeloSeleccionado(data.data[0]);
      }
    } catch (err) {
      console.error('Error fetching models', err);
    } finally {
      setModelosLoading(false);
    }
  };

  const fetchItems = async (cajaId: string) => {
    try {
      const res = await fetch(`/api/despacho/smartcard?action=items&boxId=${cajaId}`);
      const data = await res.json();
      if (data.ok) {
        setItemsEscaneados(data.data);
      }
    } catch (err) {
      console.error('Error fetching items', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoBase(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const parsedBase: BaseItem[] = data.map((row) => ({
          serie: String(row['Número de serie'] || row['serie'] || row['Serie'] || '').trim(),
          material: String(row['Material'] || row['material'] || '').trim(),
        })).filter(x => x.serie);

        setBaseCargada(parsedBase);
        setScanMessage({ text: `Archivo cargado: ${parsedBase.length} series leídas.`, type: 'success' });
      } catch (err) {
        console.error('Error parseando excel', err);
        setScanMessage({ text: 'Error al leer el archivo Excel.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCrearCaja = async () => {
    if (!modeloSeleccionado) {
      setScanMessage({ text: 'Seleccione un modelo.', type: 'error' });
      return;
    }
    if (!cantidadObjetivo || Number(cantidadObjetivo) <= 0) {
      setScanMessage({ text: 'Ingrese una cantidad objetivo válida.', type: 'error' });
      return;
    }
    if (requiereValidacion && baseCargada.length === 0) {
      setScanMessage({ text: 'Debe cargar un archivo base para validar.', type: 'error' });
      return;
    }

    setCajaLoading(true);
    setScanMessage({ text: '', type: '' });

    try {
      const numeroCaja = `SC-CAJA-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const payload = {
        numeroCaja,
        marca: 'ZTE', // Puedes hacerlo dinámico si gustas
        modelo: modeloSeleccionado,
        cantidadObjetivo: Number(cantidadObjetivo),
        requiereValidacion,
        usuarioRegistro: 'Usuario Web', // Reemplazar con Auth Real
      };

      const res = await fetch('/api/despacho/smartcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createBox', payload }),
      });
      const data = await res.json();
      
      if (data.ok) {
        setCajaActiva(data.data);
        setScanMessage({ text: `Caja ${numeroCaja} creada exitosamente.`, type: 'success' });
        setTimeout(() => serieInputRef.current?.focus(), 100);
      } else {
        setScanMessage({ text: data.error || 'Error creando caja', type: 'error' });
      }
    } catch (err: any) {
      setScanMessage({ text: err.message, type: 'error' });
    } finally {
      setCajaLoading(false);
    }
  };

  const handleScanItem = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (!serieInput.trim() || !cajaActiva) return;

    const serie = serieInput.trim();
    setSerieInput('');
    setIsScanning(true);
    setScanMessage({ text: '', type: '' });

    try {
      // 1. Validar progreso
      if (itemsEscaneados.length >= cajaActiva.cantidad_objetivo) {
        throw new Error(`La caja ya ha alcanzado su cantidad objetivo de ${cajaActiva.cantidad_objetivo} equipos.`);
      }

      // 2. Validar contra base si es requerido
      let materialSap = '';
      if (cajaActiva.requiere_validacion) {
        const enBase = baseCargada.find((x) => x.serie === serie);
        if (!enBase) {
          throw new Error(`La serie ${serie} NO se encuentra en la base cargada.`);
        }
        materialSap = enBase.material;
      }

      // 3. Registrar en backend (validará duplicados globales)
      const res = await fetch('/api/despacho/smartcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addItem',
          payload: {
            cajaId: cajaActiva.id,
            seriePrincipal: serie,
            materialSap,
            usuario: 'Usuario Web', // Auth real aquí
          }
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setScanMessage({ text: `Serie ${serie} registrada correctamente.`, type: 'success' });
        setItemsEscaneados([data.data, ...itemsEscaneados]);
      } else {
        throw new Error(data.error || 'Error al registrar serie.');
      }
    } catch (err: any) {
      setScanMessage({ text: err.message, type: 'error' });
    } finally {
      setIsScanning(false);
      setTimeout(() => serieInputRef.current?.focus(), 100);
    }
  };

  const handleEliminarItem = async (itemId: string) => {
    if (!confirm('¿Seguro que desea eliminar esta serie de la caja?')) return;
    try {
      const res = await fetch(`/api/despacho/smartcard?id=${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setItemsEscaneados(itemsEscaneados.filter(i => i.id !== itemId));
        setScanMessage({ text: 'Serie eliminada.', type: 'success' });
      } else {
        setScanMessage({ text: data.error || 'Error al eliminar.', type: 'error' });
      }
    } catch (err: any) {
      setScanMessage({ text: err.message, type: 'error' });
    }
  };

  const progressPct = cajaActiva ? Math.min(100, Math.round((itemsEscaneados.length / cajaActiva.cantidad_objetivo) * 100)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/despacho" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Despacho SMART CARD
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase">NUEVO</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">Módulo independiente de cajas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/despacho/smartcard/reporte" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <FileText className="w-4 h-4" />
            Ver Reporte General
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {scanMessage.text && (
          <div className={`p-4 rounded-xl flex items-center gap-3 shadow-sm border ${scanMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {scanMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
            <p className="text-sm font-medium">{scanMessage.text}</p>
          </div>
        )}

        {!cajaActiva ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-xl mx-auto w-full">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800">Iniciar Nueva Caja (Smart Card)</h2>
              <p className="text-sm text-slate-500 mt-1">Configura los detalles para comenzar a escanear.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Modelo a Despachar</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  value={modeloSeleccionado}
                  onChange={(e) => setModeloSeleccionado(e.target.value)}
                  disabled={modelosLoading}
                >
                  {modelosLoading ? <option>Cargando modelos...</option> : null}
                  {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Cantidad de Equipos</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  value={cantidadObjetivo}
                  onChange={(e) => setCantidadObjetivo(Number(e.target.value))}
                  min="1"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={requiereValidacion}
                      onChange={(e) => setRequiereValidacion(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                    <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">Validar contra archivo base</span>
                    <span className="text-xs text-slate-500">Solo permitirá series que existan en el Excel.</span>
                  </div>
                </label>
              </div>

              {requiereValidacion && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 border-dashed">
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Subir Archivo Base (Excel/CSV)</label>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 transition-colors"
                  />
                  {baseCargada.length > 0 && (
                    <p className="text-xs font-medium text-emerald-600 mt-3 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {baseCargada.length} series cargadas en memoria listas para validar.
                    </p>
                  )}
                </div>
              )}

              <button 
                onClick={handleCrearCaja}
                disabled={cajaLoading || (requiereValidacion && baseCargada.length === 0)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-4"
              >
                {cajaLoading ? 'Creando Caja...' : 'Crear Caja y Comenzar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Panel Izquierdo: Escáner e Info */}
            <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-6 sticky top-[100px]">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-slate-800">{cajaActiva.numero_caja}</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{cajaActiva.estado}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">SMARTCARD - {cajaActiva.modelo}</p>
                  </div>
                </div>

                {cajaActiva.requiere_validacion && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Validación Activa
                  </div>
                )}

                <div className="mt-2 border-t border-slate-100 pt-5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Escáner de Series</label>
                  <input
                    ref={serieInputRef}
                    type="text"
                    placeholder="Escanear Serie (Enter)..."
                    value={serieInput}
                    onChange={(e) => setSerieInput(e.target.value)}
                    onKeyDown={handleScanItem}
                    disabled={isScanning || itemsEscaneados.length >= cajaActiva.cantidad_objetivo}
                    className="w-full bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-lg font-mono text-slate-800 placeholder-slate-400 transition-all shadow-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 font-medium mt-2 text-right">Max: 12 digitos recomendados</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Progreso de la Caja</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{itemsEscaneados.length}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1">/ {cajaActiva.cantidad_objetivo}</span>
                  </div>
                </div>
                
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-slate-800 rounded-full transition-all duration-500 ease-out relative overflow-hidden" 
                    style={{ width: `${progressPct}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
                  </div>
                </div>
                
                {itemsEscaneados.length >= cajaActiva.cantidad_objetivo && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle className="w-5 h-5" />
                    Caja Completada
                  </div>
                )}
              </div>

            </div>

            {/* Panel Derecho: Tabla de Items */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Contenido de la Caja</h3>
                <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-600 shadow-sm">
                  {itemsEscaneados.length} items
                </span>
              </div>
              
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Serie Principal</th>
                      <th className="px-6 py-4">Material SAP</th>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsEscaneados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No hay series escaneadas en esta caja aún.
                        </td>
                      </tr>
                    ) : (
                      itemsEscaneados.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-slate-400">
                            {itemsEscaneados.length - idx}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              OK
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-700">
                            {item.serie_principal}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {item.material_sap || '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {item.usuario}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleEliminarItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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

          </div>
        )}
      </main>
    </div>
  );
}
