'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Search,
  Printer,
  Barcode,
  Settings,
  AlertCircle,
  HelpCircle,
  Check,
  Smartphone,
  Filter,
  ArrowLeft,
} from 'lucide-react';

// ─── CATÁLOGOS ────────────────────────────────────────────────────────────────

/** Fallbacks mientras carga el catálogo de Orderry */
const FALLBACK_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Honor', 'ZTE', 'Tecno', 'Realme', 'TCL', 'Alcatel'];
const FALLBACK_TYPES = ['Smartphone', 'Tablet', 'Router MIFI', 'Smartwatch', 'Modem USB'];

/** Tipos de destino para el plan de devolución */
const TIPOS_DESTINO_PLAN = ['Operador', 'Retailer', 'Cliente Final', 'Nota de Crédito', 'Seguro'];

const SUCURSALES_DATA = {
  claro:   { direccion: 'N/A', contacto: 'N/A', cantPaquetesDisp: 'N/A', cantMaxPaquetes: 'N/A' },
  retail:  { direccion: 'N/A', contacto: 'N/A', cantPaquetesDisp: 'N/A', cantMaxPaquetes: 'N/A' },
  origen:  { direccion: 'N/A', contacto: 'N/A', cantPaquetesDisp: 'N/A', cantMaxPaquetes: 'N/A' },
};

const COURRIERS_LIST = ['--CURRIER--', 'DHL Express', 'FedEx Logística', 'Cargo Expreso', 'Servicios de Entrega Local'];
const ORIGENES_LIST = ['--ORIGEN--', 'Bodega Central Norte', 'Bodega de Retorno', 'Recepción Técnica Zona 9'];
const OPERADORES_LIST = [
  '--OPERADOR--',
  'OPERADOR',
  'DISTRIBUIDOR',
  'DISTRIBUIDOR-CLARO',
  'RETEILER',
  'CLIENTE FINAL',
];
const RETAILERS_LIST = ['--RETAIL--', 'Walmart Central', 'Tiendas Max Distelsa', 'La Curacao', 'Elektra Express'];



// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface UnidadDespachada {
  imei: string;
  producto: string;
  marca: string;
  modelo: string;
  color?: string;
  tipoIngreso?: string;
  canalIngreso?: string;
  reparada?: boolean | null;
  grupo?: string;
  estado: string;
  agencia: string;
  ordenNumero?: string;
  orderId?: number | null;
}

interface PlanDevolucion {
  id: number;
  marca: string;
  modelo: string;
  tipo: string;
  agencia: string;
  cantidad: number;
  escaneados: number;
  series: string[];
}

interface Conduce {
  id: string;
  fecha: string;
  doa: boolean;
  courrier: string;
  numeroGuia: string;
  precinto: string;
  origen: string;
  operador: string;
  retail: string;
  dealer: string;
  sucursal: string;
  cantObjetivo: number;
  unidadesDespachadas: UnidadDespachada[];
  unidadesDevolver: PlanDevolucion[];
}

interface AvailableOrder {
  imei: string;
  orderId: number | null;
  ordenNumero: string;
  marca: string;
  modelo: string;
  producto: string;
  estado: string;
  color: string;
  canalIngreso: string;
  tipoIngreso: string;
}

type SucursalInfo = { direccion: string | number; contacto: string | number; cantPaquetesDisp: string | number; cantMaxPaquetes: string | number };
const SUCURSAL_VACIA: SucursalInfo = { direccion: 'undefined', contacto: 'undefined', cantPaquetesDisp: 'undefined', cantMaxPaquetes: 'undefined' };

/** Devuelve fecha y hora local formateada: "2026-05-21 · 14:35:08" */
function nowTimestamp(): string {
  const d = new Date();
  const fecha = d.toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const hora = d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${fecha} · ${hora}`;
}

/**
 * Solo se permite despachar equipos cuyo estado esté en el grupo "Entrega"
 * de Orderry (estados PARA DEVOLVER, NOTA DE CREDITO VALIDACION SAP y ESCALADA PARA NC).
 * Cualquier otro estado — En progreso, Pendiente, Listo, Nuevo, Ganado — queda bloqueado.
 */
function isEstadoBloqueado(estado: string): boolean {
  const s = estado.toUpperCase();
  const PERMITIDOS = [
    'PARA DEVOLVER',          // cubre: PARA DEVOLVER, PARA DEVOLVER CAC,
                               // PARA DEVOLVER - NOTA DE CREDITO,
                               // PARA DEVOLVER/LIFE-ONE, PARA DEVOLVER CAMBIO AGENCIA
    'NOTA DE CREDITO VALIDACION SAP',
    'ESCALADA PARA NC',       // Escaladas a Nota de Crédito
    'ESCALADA',               // Cualquier variante ESCALADA
  ];
  return !PERMITIDOS.some((p) => s.includes(p));
}

/** Color del badge de estado basado en el nombre real de Orderry */
function estadoBadgeClass(estado: string): string {
  const s = estado.toUpperCase();
  if (s.includes('DEVOLVER')) return 'bg-amber-100 text-amber-800 border border-amber-400';
  if (s.includes('NOTA') || s.includes('CREDITO')) return 'bg-red-100 text-red-800';
  if (s.includes('REPARAD') || s.includes('TERMINAD')) return 'bg-emerald-100 text-emerald-800';
  if (s.includes('ENTREGADO')) return 'bg-blue-100 text-blue-800';
  if (s.includes('ARCHIV') || s.includes('CANCEL')) return 'bg-slate-200 text-slate-600';
  return 'bg-slate-100 text-slate-700';
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function DespachoPagina() {
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [syncingAgencies, setSyncingAgencies] = useState(false);

  const handleSyncAgencies = async () => {
    setSyncingAgencies(true);
    try {
      const res = await fetch('/api/despacho/sync-agencies', { method: 'POST' });
      const data = await res.json();
      if (data.ok) showNotification(`✅ ${data.synced} agencias sincronizadas en Google Sheets.`);
      else showNotification(`⚠️ ${data.error || 'Error al sincronizar.'}`, 'error');
    } catch {
      showNotification('⚠️ No se pudo conectar con el servidor.', 'error');
    } finally {
      setSyncingAgencies(false);
    }
  };

  // Conduces
  const [conduces, setConduces] = useState<Conduce[]>([]);
  const [activeTab, setActiveTab] = useState<'despacho' | 'historial'>('despacho');
  const [selectedConduce, setSelectedConduce] = useState<Conduce | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario conduce
  const [conduceNum, setConduceNum] = useState('TCSAL-0043');
  const [doa, setDoa] = useState(false);
  const [courrier, setCourrier] = useState('--CURRIER--');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [precinto, setPrecinto] = useState('');
  const [origen, setOrigen] = useState('--ORIGEN--');
  const [operador, setOperador] = useState('--OPERADOR--');
  const [retail, setRetail] = useState('--RETAIL--');
  const [dealer, setDealer] = useState('');
  const [sucursal, setSucursal] = useState('');
  const [sucursalInfo, setSucursalInfo] = useState<SucursalInfo>(SUCURSAL_VACIA);

  // Pistoleo
  const imeiRef = useRef<HTMLInputElement>(null);
  const [imeiInput, setImeiInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [unidadesDespachadas, setUnidadesDespachadas] = useState<UnidadDespachada[]>([]);

  // Planes devolución
  const [unidadesDevolver, setUnidadesDevolver] = useState<PlanDevolucion[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [planMarca, setPlanMarca] = useState(FALLBACK_BRANDS[0]);
  const [planModelo, setPlanModelo] = useState('');
  const [planTipo, setPlanTipo] = useState(FALLBACK_TYPES[0]);
  const [planTipoDestino, setPlanTipoDestino] = useState(TIPOS_DESTINO_PLAN[0]);
  const [planCantidad, setPlanCantidad] = useState(1);

  // Catálogo Orderry (cargado en background)
  const [catalogBrands, setCatalogBrands] = useState<string[]>(FALLBACK_BRANDS);
  const [catalogModelsByBrand, setCatalogModelsByBrand] = useState<Record<string, string[]>>({});
  const [catalogTypes, setCatalogTypes] = useState<string[]>(FALLBACK_TYPES);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Directorio ORIGEN (Agencias)
  const [originsList, setOriginsList] = useState<string[]>([]);
  const [extraOrigins, setExtraOrigins] = useState<string[]>([]);
  const [showAddOrigin, setShowAddOrigin] = useState(false);
  const [newOriginInput, setNewOriginInput] = useState('');

  // Feedback
  const [scanMessage, setScanMessage] = useState({ text: '', type: '' });
  const [notificacion, setNotificacion] = useState<{ message: string; type: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Disponibles para despachar (filtro por Tipo + Canal de Ingreso)
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);

  const mountedRef = useRef(false);

  // Persistencia (solo después del primer mount para no borrar con el estado inicial vacío)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    localStorage.setItem('dispatch_conduces_v4', JSON.stringify(conduces));
  }, [conduces]);

  // Carga inicial desde localStorage (solo cliente, evita hydration mismatch)
  useEffect(() => {
    try {
      const s = localStorage.getItem('dispatch_conduces_v4');
      const list: Conduce[] = s ? JSON.parse(s) : [];
      if (list.length > 0) setConduces(list);
      const nums = list.map((c) => parseInt(c.id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
      const lastSaved = parseInt(localStorage.getItem('dispatch_last_conduce_num') ?? '43', 10);
      const next = Math.max(nums.length > 0 ? Math.max(...nums) : 0, lastSaved) + 1;
      setConduceNum(`TCSAL-${String(next).padStart(4, '0')}`);
    } catch { /* mantiene defaults */ }
    try {
      const se = localStorage.getItem('dispatch_extra_origins');
      if (se) setExtraOrigins(JSON.parse(se));
    } catch { /* mantiene defaults */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar catálogo desde Orderry
  useEffect(() => {
    fetch('/api/despacho/catalog')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.brands) && d.brands.length) setCatalogBrands(d.brands);
        if (d.modelsByBrand && typeof d.modelsByBrand === 'object') setCatalogModelsByBrand(d.modelsByBrand);
        if (Array.isArray(d.productTypes) && d.productTypes.length) setCatalogTypes(d.productTypes);
      })
      .catch(() => { /* mantiene fallbacks */ })
      .finally(() => setCatalogLoading(false));
  }, []);

  // Cargar directorio ORIGEN (Agencias/Dealers) — Orderry + Google Sheets fusionados
  useEffect(() => {
    const mergeAll = (orderry: string[], sheets: string[]) => {
      const all = [...orderry, ...sheets, ...extraOrigins];
      const seen = new Set<string>();
      return all
        .filter((s) => { const k = s.toUpperCase(); if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => a.localeCompare(b, 'es'));
    };

    let orderryList: string[] = [];
    let sheetsList: string[] = [];
    let pending = 2;

    const done = () => {
      if (--pending === 0) {
        const merged = mergeAll(orderryList, sheetsList);
        setOriginsList(merged.length > 0 ? merged : extraOrigins);
      }
    };

    fetch('/api/despacho/origins')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.origins)) orderryList = d.origins as string[]; })
      .catch(() => {})
      .finally(done);

    fetch('/api/despacho/sheet-agencies')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.agencies)) sheetsList = d.agencies as string[]; })
      .catch(() => {})
      .finally(done);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir extras cuando cambian
  useEffect(() => {
    localStorage.setItem('dispatch_extra_origins', JSON.stringify(extraOrigins));
  }, [extraOrigins]);

  const handleAddOrigin = () => {
    const trimmed = newOriginInput.trim().toUpperCase();
    if (!trimmed || originsList.some((o) => o.toUpperCase() === trimmed)) {
      setShowAddOrigin(false); setNewOriginInput(''); return;
    }
    const updated = [...extraOrigins, trimmed];
    setExtraOrigins(updated);
    setOriginsList((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'es')));
    setDealer(trimmed);
    setShowAddOrigin(false); setNewOriginInput('');
    showNotification(`Agencia "${trimmed}" agregada al directorio local.`);
  };

  // Al abrir Vista Ficha, auto-rellenar grupos faltantes consultando Orderry
  useEffect(() => {
    if (!selectedConduce) return;
    const missing = selectedConduce.unidadesDespachadas.filter((u) => !u.grupo);
    if (missing.length === 0) return;

    (async () => {
      const filled = await Promise.all(
        missing.map(async (u) => {
          try {
            const params = new URLSearchParams({ imei: u.imei });
            if (u.orderId) params.set('orderId', String(u.orderId));
            const res = await fetch(`/api/despacho/imei-lookup?${params.toString()}`);
            if (!res.ok) return { imei: u.imei, grupo: '' };
            const data = await res.json();
            return { imei: u.imei, grupo: data.grupo ?? '' };
          } catch {
            return { imei: u.imei, grupo: '' };
          }
        }),
      );

      const grupoMap = Object.fromEntries(filled.map((f) => [f.imei, f.grupo]));
      const updated: Conduce = {
        ...selectedConduce,
        unidadesDespachadas: selectedConduce.unidadesDespachadas.map((u) =>
          grupoMap[u.imei] ? { ...u, grupo: grupoMap[u.imei] } : u,
        ),
      };
      setSelectedConduce(updated);
      // Persistir también en el historial
      setConduces((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConduce?.id]);

  // Consultar disponibles cada vez que cambia el filtro Tipo o Canal de Ingreso
  useEffect(() => {
    const hasFilter = operador !== '--OPERADOR--' || !!dealer;
    if (!hasFilter) { setAvailableOrders([]); return; }
    setAvailableLoading(true);
    const params = new URLSearchParams();
    if (operador !== '--OPERADOR--') params.set('tipoIngreso', operador);
    if (dealer) params.set('canalIngreso', dealer);
    const timer = setTimeout(() => {
      fetch(`/api/despacho/available-orders?${params}`)
        .then((r) => r.json())
        .then((d) => setAvailableOrders(Array.isArray(d.orders) ? d.orders : []))
        .catch(() => setAvailableOrders([]))
        .finally(() => setAvailableLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operador, dealer]);

  const handleCargarDisponibles = () => {
    const nuevas: UnidadDespachada[] = [];
    for (const o of availableOrders) {
      if (!o.imei || unidadesDespachadas.some((u) => u.imei === o.imei)) continue;
      nuevas.push({
        imei: o.imei, producto: o.producto, marca: o.marca, modelo: o.modelo,
        estado: o.estado, agencia: dealer || operador,
        ordenNumero: o.ordenNumero, orderId: o.orderId,
        color: o.color, tipoIngreso: o.tipoIngreso, canalIngreso: o.canalIngreso,
        reparada: null,
      });
    }
    if (nuevas.length > 0) {
      setUnidadesDespachadas((prev) => [...prev, ...nuevas]);
      showNotification(`${nuevas.length} equipo(s) cargados al conduce.`);
    } else {
      showNotification('Todos los disponibles ya están en el conduce.', 'info');
    }
  };

  // Resetear modelo cuando cambia la marca en el plan modal
  useEffect(() => { setPlanModelo(''); }, [planMarca]);

  // Info sucursal dinámica
  useEffect(() => {
    if (operador !== '--OPERADOR--') {
      setSucursalInfo(SUCURSALES_DATA.claro);
    } else if (retail !== '--RETAIL--') {
      setSucursalInfo(SUCURSALES_DATA.retail);
    } else if (origen !== '--ORIGEN--') {
      setSucursalInfo(SUCURSALES_DATA.origen);
    } else {
      setSucursalInfo(SUCURSAL_VACIA);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen, operador, retail]);

  const showNotification = (message: string, type = 'success') => {
    setNotificacion({ message, type });
    setTimeout(() => setNotificacion(null), 4000);
  };

  // ── Lookup IMEI en Orderry ────────────────────────────────────────────────
  const lookupImei = async (imei: string) => {
    const res = await fetch(`/api/despacho/imei-lookup?imei=${encodeURIComponent(imei)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ found: boolean; orderId?: number | null; marca: string; modelo: string; producto: string; rawStatus: string; estadoGanado: string; ordenNumero?: string; tecnico?: string; cliente?: string; tipoOrden?: string; color?: string; reparada?: boolean | null; canalIngreso?: string; tipoIngreso?: string; grupo?: string }>;  
  };

  // ── Procesamiento de IMEI ─────────────────────────────────────────────────
  const processImeiScan = async (cleanImei: string) => {
    // Caso A: plan de devolución activo
    if (activePlanId !== null) {
      const planIndex = unidadesDevolver.findIndex((p) => p.id === activePlanId);
      if (planIndex !== -1) {
        const plan = unidadesDevolver[planIndex];
        if (plan.escaneados >= plan.cantidad) {
          setScanMessage({ text: `🚫 El lote para ${plan.marca} ${plan.modelo} ya alcanzó su cantidad (${plan.cantidad}).`, type: 'error' });
          setImeiInput(''); return;
        }
        const dup = unidadesDespachadas.some((u) => u.imei === cleanImei) || unidadesDevolver.some((p) => p.series.includes(cleanImei));
        if (dup) { setScanMessage({ text: '⚠️ IMEI ya cargado en el sistema.', type: 'error' }); setImeiInput(''); return; }

        // Consultar Orderry para obtener estado real y número de orden
        setScanLoading(true);
        setScanMessage({ text: 'Consultando estado en Orderry…', type: 'info' });
        let realEstado = 'Sin estado';
        let realOrdenNum = '';
        let realMarca = plan.marca;
        let realModelo = plan.modelo;
        let realOrderId: number | null = null;
        let realColor = 'N/A';
        let realTipoIngreso = '';
        let realCanalIngreso = '';
        let realReparada: boolean | null = null;
        let realGrupo = '';
        try {
          const result = await lookupImei(cleanImei);
          if (result.found) {
            realEstado = result.rawStatus || result.estadoGanado;
            realOrdenNum = result.ordenNumero ?? '';
            realMarca = result.marca || plan.marca;
            realModelo = result.modelo || plan.modelo;
            realOrderId = result.orderId ?? null;
            realColor = result.color ?? 'N/A';
            realTipoIngreso = result.tipoIngreso ?? '';
            realCanalIngreso = result.canalIngreso ?? '';
            realReparada = result.reparada ?? null;
            realGrupo = result.grupo ?? '';
          }
        } catch { /* mantiene defaults del plan */ }
        setScanLoading(false);

        // Bloquear si el equipo ya está entregado / archivado
        if (realEstado !== 'Sin estado' && isEstadoBloqueado(realEstado)) {
          setScanMessage({
            text: `🚫 IMEI ${cleanImei} — Estado: [${realEstado}] — No disponible para despacho.`,
            type: 'error',
          });
          setImeiInput('');
          imeiRef.current?.focus();
          return;
        }

        const copiaPlanes = [...unidadesDevolver];
        copiaPlanes[planIndex].series.push(cleanImei);
        copiaPlanes[planIndex].escaneados += 1;
        setUnidadesDevolver(copiaPlanes);
        setUnidadesDespachadas((prev) => [...prev, {
          imei: cleanImei, producto: `${realMarca} ${realModelo} (${plan.tipo})`,
          marca: realMarca, modelo: realModelo, estado: realEstado, agencia: plan.agencia,
          ordenNumero: realOrdenNum, orderId: realOrderId,
          color: realColor, tipoIngreso: realTipoIngreso, canalIngreso: realCanalIngreso, reparada: realReparada, grupo: realGrupo,
        }]);
        setScanMessage({ text: `✅ ${realMarca} ${realModelo} → lote [${plan.marca} ${plan.modelo}] — Estado: [${realEstado}]${realOrdenNum ? ` — Orden: ${realOrdenNum}` : ''}`, type: 'success' });
        if (copiaPlanes[planIndex].escaneados >= plan.cantidad) {
          showNotification(`¡Lote ${plan.marca} ${plan.modelo} completado!`);
          setActivePlanId(null);
        }
        setImeiInput('');
        imeiRef.current?.focus();
        return;
      }
    }

    // Caso B: escaneo general — consultar Orderry
    if (unidadesDespachadas.some((u) => u.imei === cleanImei)) {
      setScanMessage({ text: '⚠️ Este IMEI ya está en la lista.', type: 'error' });
      setImeiInput(''); return;
    }

    setScanLoading(true);
    setScanMessage({ text: 'Buscando IMEI en Orderry…', type: 'info' });

    try {
      const result = await lookupImei(cleanImei);
      if (result.found) {
        const displayEstado = result.rawStatus || result.estadoGanado;

        // Bloquear si el equipo ya fue entregado / archivado
        if (isEstadoBloqueado(displayEstado)) {
          setScanMessage({
            text: `🚫 ${result.marca} ${result.modelo} — Orden: ${result.ordenNumero ?? 'N/A'} — Estado: [${displayEstado}] — Estado no habilitado para despacho.`,
            type: 'error',
          });
        } else {
          // Auto-fill DESTINO desde datos de la orden si los campos están vacíos
          let efectivoOperador = operador;
          let efectivoDealer = dealer;
          if (result.tipoIngreso && result.tipoIngreso !== 'N/A') {
            const match = OPERADORES_LIST.find((o) => o.toUpperCase() === result.tipoIngreso!.toUpperCase());
            const newOp = (match && match !== '--OPERADOR--') ? match : result.tipoIngreso!;
            setOperador(newOp);
            efectivoOperador = newOp;
          }
          if (result.canalIngreso && result.canalIngreso !== 'N/A') {
            const rawCanal = result.canalIngreso;
            const matched = originsList.find((o) => o.toUpperCase() === rawCanal.toUpperCase());
            const valueToSet = matched ?? rawCanal;
            if (!matched) {
              // No está en la lista → agregar dinámicamente para que el <select> pueda seleccionarlo
              setOriginsList((prev) =>
                prev.some((o) => o.toUpperCase() === rawCanal.toUpperCase())
                  ? prev
                  : [...prev, rawCanal].sort((a, b) => a.localeCompare(b, 'es'))
              );
            }
            setDealer(valueToSet);
            efectivoDealer = valueToSet;
          }
          const efectivoDestino = efectivoOperador !== '--OPERADOR--' ? efectivoOperador : retail !== '--RETAIL--' ? retail : origen;

          setUnidadesDespachadas((prev) => [...prev, {
            imei: cleanImei, producto: result.producto, marca: result.marca,
            modelo: result.modelo, estado: displayEstado, agencia: efectivoDealer || efectivoDestino,
            ordenNumero: result.ordenNumero, orderId: result.orderId ?? null,
            color: result.color ?? 'N/A',
            tipoIngreso: result.tipoIngreso ?? 'N/A',
            canalIngreso: result.canalIngreso ?? 'N/A',
            reparada: result.reparada ?? null,
            grupo: result.grupo ?? '',
          }]);
          setScanMessage({ text: `✅ ${result.marca} ${result.modelo} — Estado: [${displayEstado}] — Orden: ${result.ordenNumero ?? 'N/A'}`, type: 'success' });
        }
      } else {
        // No encontrado en Orderry — rechazar
        setScanMessage({ text: `🚫 IMEI ${cleanImei} no encontrado en Orderry. No se puede agregar.`, type: 'error' });
      }
    } catch (err: any) {
      setScanMessage({ text: `❌ Error consultando Orderry: ${err.message}`, type: 'error' });
    } finally {
      setScanLoading(false);
      setImeiInput('');
      imeiRef.current?.focus();
    }
  };

  const handleImeiScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = imeiInput.trim();
    if (!clean || scanLoading) return;
    processImeiScan(clean);
  };

  // ── Plan devolución ────────────────────────────────────────────────────────
  const handleCreateDevolucionPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModelo.trim()) { showNotification('Ingrese el modelo del equipo.', 'error'); return; }
    const plan: PlanDevolucion = { id: Date.now(), marca: planMarca, modelo: planModelo.trim(), tipo: planTipo, agencia: planTipoDestino, cantidad: planCantidad, escaneados: 0, series: [] };
    setUnidadesDevolver((prev) => [...prev, plan]);
    setActivePlanId(plan.id);
    setPlanModelo(''); setPlanCantidad(1); setPlanTipoDestino(TIPOS_DESTINO_PLAN[0]); setShowPlanModal(false);
    showNotification('Plan configurado. Proceda a pistolear las series.');
  };

  // ── Guardar conduce + actualizar status ENTREGADO en Orderry ─────────────
  const handleSaveConduce = async () => {
    if (unidadesDespachadas.length === 0) { showNotification('Escanee al menos una unidad.', 'error'); return; }
    if (isSaving) return;

    setIsSaving(true);

    // Persistir el número actual como último usado (sobrevive a eliminaciones)
    try {
      const n = parseInt(conduceNum.replace(/\D/g, ''), 10);
      if (!isNaN(n)) localStorage.setItem('dispatch_last_conduce_num', String(n));
    } catch { /* ignorar */ }

    const nuevo: Conduce = {
      id: conduceNum, fecha: nowTimestamp(), doa, courrier, numeroGuia, precinto,
      origen, operador, retail, dealer: dealer || 'Sin Dealer', sucursal: sucursal || 'Sin Sucursal',
      cantObjetivo: unidadesDespachadas.length, unidadesDespachadas, unidadesDevolver,
    };
    setConduces((prev) => [nuevo, ...prev]);
    setSelectedConduce(nuevo);

    // ── Guardar conduce en Google Sheets (en segundo plano, sin bloquear UX)
    fetch('/api/despacho/save-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) showNotification(`📋 Conduce registrado en Google Sheets (${d.rows} filas).`);
        else showNotification(`⚠️ Sheets: ${d.error || 'No se pudo guardar.'}`, 'error');
      })
      .catch(() => showNotification('⚠️ No se pudo conectar con Google Sheets.', 'error'));

    // ── Actualizar a ENTREGADO en Orderry solo las órdenes del grupo Entrega
    const paraActualizar = unidadesDespachadas
      .filter((u) => u.orderId != null && !isEstadoBloqueado(u.estado))
      .map((u) => Number(u.orderId))
      .filter((id) => !isNaN(id) && id > 0);

    if (paraActualizar.length > 0) {
      showNotification(`Guardado. Actualizando ${paraActualizar.length} orden(es) a ENTREGADO en Orderry…`);
      try {
        const res = await fetch('/api/despacho/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: paraActualizar }),
        });
        const data = await res.json();
        if (data.updated?.length > 0) {
          showNotification(`✅ ${data.updated.length} orden(es) marcadas como "${data.statusUsed}" en Orderry.`);
        }
        if (data.failed?.length > 0) {
          showNotification(`⚠️ ${data.failed.length} orden(es) no pudieron actualizarse en Orderry.`, 'error');
        }
        if (data.error) {
          showNotification(`⚠️ Orderry: ${data.error}`, 'error');
        }
      } catch (err: any) {
        showNotification(`⚠️ Error de red al actualizar Orderry: ${err.message}`, 'error');
      }
    } else {
      showNotification(`Conduce ${conduceNum} guardado.`);
    }

    // Reset — calcular siguiente número preservando el máximo histórico
    setConduceNum((prev) => {
      try {
        const s = localStorage.getItem('dispatch_conduces_v4');
        const list: Conduce[] = s ? JSON.parse(s) : [];
        const nums = list.map((c) => parseInt(c.id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
        const lastSaved = parseInt(localStorage.getItem('dispatch_last_conduce_num') ?? '0', 10);
        const current = parseInt(prev.replace(/\D/g, ''), 10);
        const next = Math.max(nums.length > 0 ? Math.max(...nums) : 0, lastSaved, current) + 1;
        localStorage.setItem('dispatch_last_conduce_num', String(next - 1));
        return `TCSAL-${String(next).padStart(4, '0')}`;
      } catch { return prev; }
    });
    setDoa(false); setCourrier('--CURRIER--'); setNumeroGuia(''); setPrecinto('');
    setOrigen('--ORIGEN--'); setOperador('--OPERADOR--'); setRetail('--RETAIL--');
    setDealer(''); setSucursal('');
    setUnidadesDespachadas([]); setUnidadesDevolver([]); setActivePlanId(null);
    setScanMessage({ text: '', type: '' });
    setIsSaving(false);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">

      {/* HEADER */}
      <header className="bg-slate-900 text-white shadow-md py-4 px-6 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white transition text-xs mr-1" title="Dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="bg-[#001e6c] p-2 rounded"><Barcode className="w-6 h-6" /></div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Sistema de Despachos &amp; Logística</h1>
            <p className="text-xs text-slate-400">Pistoleo de Equipos • Grupo Ganado • TCSAL</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncAgencies}
            disabled={syncingAgencies}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-xs text-white px-3 py-1.5 rounded-md border border-emerald-600 transition"
            title="Exportar listado de agencias de Orderry a Google Sheets"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{syncingAgencies ? 'Sincronizando…' : 'Sync Agencias → Sheets'}</span>
          </button>
          <button onClick={() => setShowApiSettings(!showApiSettings)} className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 transition">
            <Settings className="w-3.5 h-3.5 text-emerald-400" /><span>API Key</span>
          </button>
          <div className="hidden md:flex items-center bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-md text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />Orderry Conectado
          </div>
        </div>
      </header>

      {/* API PANEL */}
      {showApiSettings && (
        <div className="bg-slate-800 text-white p-4 border-b border-slate-700">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center"><Settings className="w-4 h-4 mr-1.5" />Conexión Orderry</h3>
              <p className="text-xs text-slate-300">El pistoleo valida IMEIs en tiempo real. La API Key se configura en <code className="font-mono text-emerald-300">ORDERRY_API_KEY</code> (variable de entorno del servidor).</p>
            </div>
            <button onClick={() => setShowApiSettings(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded font-bold transition">Cerrar</button>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="bg-white border-b border-slate-200 shadow-sm flex overflow-x-auto">
        {(['despacho', 'historial'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center px-6 py-4 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === tab ? 'border-[#001e6c] text-[#001e6c] bg-slate-50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            {tab === 'despacho' ? <><Barcode className="w-4 h-4 mr-2" />Ventana de Despacho &amp; Pistoleo</> : <><FileText className="w-4 h-4 mr-2" />Historial &amp; Correlativos TCSAL<span className="ml-2 bg-slate-200 text-slate-800 text-xs px-2 py-0.5 rounded-full font-bold">{conduces.length}</span></>}
          </button>
        ))}
      </div>

      {/* NOTIFICACIÓN */}
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white flex items-center space-x-3 ${notificacion.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {notificacion.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-semibold">{notificacion.message}</span>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">

        {/* ══════════════ TAB DESPACHO ══════════════ */}
        {activeTab === 'despacho' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden">

              {/* Cabecera */}
              <div className="bg-[#001e6c] px-6 py-3 flex justify-end items-center text-white">
                <div className="bg-[#00155a] border border-blue-400 px-3 py-1 rounded-full text-[11px] font-bold">ESTADO ACTUAL: <span className="text-amber-400">GANADO</span></div>
              </div>

              {/* Datos del conduce */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Col izquierda */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">No. Conduce</label>
                      <input type="text" value={conduceNum} onChange={(e) => setConduceNum(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#001e6c]" />
                    </div>
                    <div className="flex items-center pb-2">
                      <input type="checkbox" id="doa-cb" checked={doa} onChange={(e) => setDoa(e.target.checked)} className="h-4 w-4 rounded" />
                      <label htmlFor="doa-cb" className="ml-2 text-xs font-black text-slate-900 tracking-wider">DOA</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">COURRIER</label>
                    <select value={courrier} onChange={(e) => setCourrier(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]">
                      {COURRIERS_LIST.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">NUMERO GUIA CURRIER</label>
                    <input type="text" placeholder="Número de guía" value={numeroGuia} onChange={(e) => setNumeroGuia(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">PRECINTO (Seguridad de Lote)</label>
                    <input type="text" placeholder="Número de precinto" value={precinto} onChange={(e) => setPrecinto(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]" />
                  </div>
                </div>

                {/* Col derecha: Destino */}
                <div className="lg:col-span-7 border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <div className="bg-[#001e6c] text-white px-3 py-1 rounded text-xs font-bold tracking-wider uppercase">DESTINO</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipo de Ingreso</label>
                      <select value={operador} onChange={(e) => setOperador(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]">
                        {OPERADORES_LIST.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Canal de Ingreso / Agencia {originsList.length > 0 && <span className="text-emerald-600 font-normal">({originsList.length})</span>}
                      </label>
                      {showAddOrigin ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nueva agencia…"
                            value={newOriginInput}
                            onChange={(e) => setNewOriginInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddOrigin(); if (e.key === 'Escape') { setShowAddOrigin(false); setNewOriginInput(''); } }}
                            className="flex-1 p-2 bg-white border border-emerald-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button type="button" onClick={handleAddOrigin} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-bold">OK</button>
                          <button type="button" onClick={() => { setShowAddOrigin(false); setNewOriginInput(''); }} className="px-2 py-1 bg-slate-300 hover:bg-slate-400 text-slate-700 text-xs rounded">✕</button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {originsList.length > 0 ? (
                            <select value={dealer} onChange={(e) => setDealer(e.target.value)} className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]">
                              <option value="">-- Seleccionar Agencia --</option>
                              {originsList.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type="text" placeholder="Canal / Agencia" value={dealer} onChange={(e) => setDealer(e.target.value)} className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none" />
                          )}
                          <button type="button" onClick={() => setShowAddOrigin(true)} title="Agregar nueva agencia" className="px-2 py-1 bg-[#001e6c] hover:bg-[#00155a] text-white text-xs rounded font-bold">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Sucursal</label>
                    <input type="text" placeholder="Sucursal" value={sucursal} onChange={(e) => setSucursal(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]" />
                  </div>
                </div>
              </div>

              {/* DISPONIBLES PARA DESPACHAR */}
              {(operador !== '--OPERADOR--' || !!dealer) && (
                <div className="border-t border-slate-200 bg-blue-50 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-slate-600">Equipos disponibles (Grupo Entrega):</span>
                    {availableLoading ? (
                      <span className="text-blue-600 text-xs font-semibold animate-pulse">Consultando Orderry…</span>
                    ) : (
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${
                        availableOrders.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                      }`}>{availableOrders.length} disponible{availableOrders.length !== 1 ? 's' : ''}</span>
                    )}
                    <span className="text-xs text-slate-500">
                      {operador !== '--OPERADOR--' && <span className="font-semibold text-[#001e6c]">Tipo: {operador}</span>}
                      {dealer && <span className="ml-2 font-semibold text-[#001e6c]">Canal: {dealer}</span>}
                    </span>
                  </div>
                  {availableOrders.length > 0 && !availableLoading && (
                    <button
                      type="button"
                      onClick={handleCargarDisponibles}
                      className="bg-[#001e6c] hover:bg-[#00155a] text-white px-5 py-2 rounded text-xs font-bold transition shadow-sm"
                    >
                      Cargar {availableOrders.filter((o) => !unidadesDespachadas.some((u) => u.imei === o.imei)).length} en Conduce
                    </button>
                  )}
                </div>
              )}

              {/* PASO 1 — banner cantidad */}
              <div className="bg-[#00155a] text-white px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-blue-900">
                <div className="flex items-center gap-3">
                  <span className="bg-amber-500 text-slate-900 font-black text-xs px-2.5 py-1.5 rounded">PASO 1</span>
                  <div>
                    <p className="font-bold text-sm">Definir Cantidad Objetivo a Despachar Primero</p>
                    <p className="text-xs text-blue-200">Establece el número exacto de equipos que cargarás con la pistola de código de barras.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-blue-200 font-bold">
                  <span>Cantidad Total:</span>
                  <span className="text-amber-400 text-2xl font-black">{unidadesDespachadas.length}</span>
                </div>
              </div>

              {/* CONTROLES PISTOLEO */}
              <div className="border-t border-slate-200 bg-slate-50 p-6">
                {activePlanId !== null && (() => {
                  const plan = unidadesDevolver.find((p) => p.id === activePlanId);
                  return plan ? (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 mb-4 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>🎯 <strong>Modo Devolución Activo:</strong> Cargando series para <strong>{plan.marca} {plan.modelo}</strong> → <strong>{plan.agencia}</strong></span>
                      </div>
                      <button onClick={() => { setActivePlanId(null); showNotification('Modo devolución cancelado.', 'info'); }} className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Volver a General</button>
                    </div>
                  ) : null;
                })()}

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-[#001e6c] flex items-center mb-1"><Barcode className="w-4 h-4 mr-1 text-amber-500" />Pistolear IMEI de Equipos</h3>
                    <p className="text-xs text-slate-500">
                      Escaneados: <strong className="text-slate-800">{unidadesDespachadas.length}</strong>
                      {scanLoading && <span className="ml-2 text-blue-600 animate-pulse font-semibold">Consultando Orderry…</span>}
                    </p>
                  </div>
                  <form onSubmit={handleImeiScanSubmit} className="flex gap-2 w-full md:w-auto">
                    <input ref={imeiRef} type="text" placeholder="Pistolear / Digitar IMEI aquí..." value={imeiInput} onChange={(e) => setImeiInput(e.target.value)} disabled={scanLoading}
                      className="p-2 border border-slate-300 rounded text-xs font-mono w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-[#001e6c] disabled:bg-slate-200" />
                    <button type="submit" disabled={!imeiInput.trim() || scanLoading} className="bg-[#001e6c] hover:bg-[#00155a] text-white px-4 py-2 rounded text-xs font-bold transition disabled:opacity-50">
                      {scanLoading ? '…' : 'Escanear'}
                    </button>
                  </form>
                </div>

                {scanMessage.text && (
                  <div className={`mt-3 p-3 rounded-lg text-xs flex items-start space-x-2 ${scanMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{scanMessage.text}</span>
                  </div>
                )}
              </div>

              {/* LISTA: Para DESPACHAR */}
              <div className="border-t border-slate-300">
                <div className="bg-[#00155a] px-6 py-2.5 text-white flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider">LISTADO DE EQUIPOS PARA DESPACHAR ({unidadesDespachadas.length})</span>
                  <span className="text-[11px] bg-emerald-600 border border-emerald-400 px-3 py-0.5 rounded font-bold">Carga Total Lista para Conduce</span>
                </div>
                <div className="p-4 bg-slate-50">
                  {unidadesDespachadas.length === 0 ? (
                    <div className="text-center py-6 text-slate-400"><Barcode className="w-8 h-8 mx-auto mb-2 text-slate-300" /><p className="text-xs">Proceda con el pistoleo de IMEIs.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border text-xs bg-white">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 text-[10px]">
                            <th className="p-2 border text-center w-8">No.</th>
                            <th className="p-2 border">IMEI / Serial</th>
                            <th className="p-2 border">No. Orden</th>
                            <th className="p-2 border">Marca</th>
                            <th className="p-2 border">Modelo</th>
                            <th className="p-2 border">Color</th>
                            <th className="p-2 border">Producto</th>
                            <th className="p-2 border">Canal de Ingreso</th>
                            <th className="p-2 border">Tipo de Ingreso</th>
                            <th className="p-2 border">Estatus</th>
                            <th className="p-2 border text-center">Acción (Reparada)</th>
                            <th className="p-2 border text-center">Estatus</th>
                            <th className="p-2 border text-center">—</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unidadesDespachadas.map((item, idx) => (
                            <tr key={item.imei} className="hover:bg-slate-50">
                              <td className="p-2 border text-slate-400 font-bold text-center">{idx + 1}</td>
                              <td className="p-2 border font-mono font-bold text-emerald-700">{item.imei}</td>
                              <td className="p-2 border font-mono font-bold text-[#001e6c] whitespace-nowrap">{item.ordenNumero || '—'}</td>
                              <td className="p-2 border font-semibold text-slate-800">{item.marca}</td>
                              <td className="p-2 border text-slate-700">{item.modelo}</td>
                              <td className="p-2 border text-slate-600">{item.color ?? 'N/A'}</td>
                              <td className="p-2 border text-slate-600 max-w-[160px] truncate" title={item.producto}>{item.producto}</td>
                              <td className="p-2 border font-semibold text-[#001e6c]">{item.canalIngreso ?? 'N/A'}</td>
                              <td className="p-2 border text-slate-600">{item.tipoIngreso ?? 'N/A'}</td>
                              <td className="p-2 border">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${estadoBadgeClass(item.estado)}`}>{item.estado}</span>
                              </td>
                              <td className="p-2 border text-center">
                                {item.reparada === true ? (
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"><Check className="w-3 h-3" />Reparada</span>
                                ) : item.reparada === false ? (
                                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">✗ No Reparada</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">Sin Info</span>
                                )}
                              </td>
                              <td className="p-2 border text-center">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center"><Check className="w-3 h-3 mr-0.5" />Cargado</span>
                              </td>
                              <td className="p-2 border text-center">
                                <button onClick={() => setUnidadesDespachadas((p) => p.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones acción */}
              <div className="bg-slate-100 px-6 py-4 flex justify-center items-center gap-4 border-t border-slate-300">
                {(() => {
                  const canSave = unidadesDespachadas.length > 0 && courrier !== '--CURRIER--' && numeroGuia.trim() !== '' && precinto.trim() !== '';
                  return (
                    <button
                      type="button"
                      onClick={handleSaveConduce}
                      disabled={isSaving || !canSave}
                      title={!canSave ? 'Completa: Courrier, Número de Guía y Precinto' : ''}
                      className="bg-[#0070c0] hover:bg-[#005ba3] text-white px-8 py-2.5 rounded font-bold text-xs shadow-md transition uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Actualizando Orderry…' : 'Guardar e Imprimir Conduce'}
                    </button>
                  );
                })()}
                <button type="button" onClick={() => { setUnidadesDespachadas([]); setUnidadesDevolver([]); setActivePlanId(null); setScanMessage({ text: '', type: '' }); showNotification('Despacho cancelado.', 'info'); }} className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded font-bold text-xs shadow-md transition uppercase tracking-wider">Cancelar Lote</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB HISTORIAL ══════════════ */}
        {activeTab === 'historial' && (
          <div className="bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#001e6c] flex items-center"><FileText className="w-5 h-5 mr-2" />Correlativos TCSAL</h2>
                <p className="text-xs text-slate-500">Historial verificado con control consecutivo.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input type="text" placeholder="Buscar IMEI, Conduce, Destinatario…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#001e6c]" />
              </div>
            </div>
            {conduces.length === 0 ? (
              <div className="p-12 text-center text-slate-400"><p className="text-sm">No hay conduces registrados.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead><tr className="bg-slate-100 text-slate-600 font-bold border-b"><th className="p-3 border">No. Conduce</th><th className="p-3 border">Fecha / Hora</th><th className="p-3 border">Tipo Destino</th><th className="p-3 border">Guía / Courier</th><th className="p-3 border">Precinto</th><th className="p-3 border text-center">Unidades</th><th className="p-3 border text-center">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {conduces.filter((c) => { const s = searchTerm.toLowerCase(); return c.id.toLowerCase().includes(s) || c.courrier.toLowerCase().includes(s) || c.numeroGuia.toLowerCase().includes(s) || c.dealer.toLowerCase().includes(s) || c.unidadesDespachadas.some((u) => u.imei.includes(s)); }).map((cond) => (
                      <tr key={cond.id} className="hover:bg-slate-50">
                        <td className="p-3 border font-bold font-mono text-[#001e6c]">{cond.id}</td>
                        <td className="p-3 border whitespace-nowrap"><div className="font-semibold text-slate-700">{cond.fecha ? cond.fecha.split(' ')[0] : '—'}</div><div className="text-[10px] font-mono text-slate-500">{cond.fecha ? cond.fecha.split(' ').slice(1).join(' ') : ''}</div></td>
                        <td className="p-3 border"><div className="font-bold text-slate-800">{cond.operador !== '--OPERADOR--' ? cond.operador : cond.retail !== '--RETAIL--' ? cond.retail : cond.origen}</div><div className="text-[10px] text-slate-500">{cond.dealer} • {cond.sucursal}</div></td>
                        <td className="p-3 border"><span className="font-semibold text-slate-700">{cond.courrier}</span><div className="text-[10px] font-mono text-slate-500">Guía: {cond.numeroGuia || 'N/A'}</div></td>
                        <td className="p-3 border font-mono font-bold text-slate-600">{cond.precinto || 'Sin Precinto'}</td>
                        <td className="p-3 border text-center"><span className="bg-emerald-100 text-emerald-800 font-black px-2 py-1 rounded text-[10px]">{cond.unidadesDespachadas.length} escaneados</span></td>
                        <td className="p-3 border text-center">
                          <div className="flex justify-center space-x-2">
                            <button onClick={() => setSelectedConduce(cond)} className="bg-[#001e6c] hover:bg-[#00155a] text-white px-2.5 py-1.5 rounded font-bold text-[10px] flex items-center transition"><Printer className="w-3.5 h-3.5 mr-1 text-amber-400" />Vista Ficha</button>
                            <button onClick={async () => { if (!confirm('¿Eliminar este Conduce? También se eliminará de Google Sheets.')) return; setConduces((p) => p.filter((c) => c.id !== cond.id)); showNotification('Conduce removido.', 'info'); try { const r = await fetch('/api/despacho/save-sheet', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cond.id }) }); const d = await r.json(); if (d.ok) showNotification(`🗑️ Eliminado de Google Sheets (${d.deleted} filas).`); else showNotification(`⚠️ Sheets: ${d.error || 'No se pudo eliminar.'}`, 'error'); } catch { showNotification('⚠️ No se pudo conectar con Google Sheets.', 'error'); } }} className="text-red-600 hover:text-red-900 font-bold px-1.5 py-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-900 py-6 border-t border-slate-700 mt-auto text-center text-xs text-slate-400">
        <p>© 2026 Módulo Despacho — Operaciones Integradas.</p>
        <p className="mt-1 text-slate-500">IMEIs validados en tiempo real contra Orderry.</p>
      </footer>

      {/* MODAL: PLAN DEVOLUCIÓN */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-300 overflow-hidden">
            <div className="bg-[#001e6c] text-white px-6 py-4 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Filter className="w-4 h-4 text-amber-400" />Filtros de Lote para Devolución</span>
              <button onClick={() => setShowPlanModal(false)} className="text-white hover:text-amber-400 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleCreateDevolucionPlan} className="p-6 space-y-4 text-sm">
              <p className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded border">
                Configure las características del lote. Al confirmar, el escáner se activará para recibir las series.
                {catalogLoading && <span className="ml-2 text-blue-600 animate-pulse font-semibold">Cargando catálogo Orderry…</span>}
              </p>

              {/* Marca */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marca</label>
                <select value={planMarca} onChange={(e) => setPlanMarca(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#001e6c] focus:outline-none">
                  {catalogBrands.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              {/* Modelo — select del catálogo con datalist para escritura libre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Modelo
                  {(catalogModelsByBrand[planMarca]?.length ?? 0) > 0 && (
                    <span className="ml-2 text-[10px] text-emerald-600 font-normal normal-case">
                      ({catalogModelsByBrand[planMarca].length} en catálogo)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  list={`models-${planMarca}`}
                  placeholder="Seleccione o escriba el modelo…"
                  value={planModelo}
                  onChange={(e) => setPlanModelo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#001e6c] focus:outline-none font-semibold"
                />
                <datalist id={`models-${planMarca}`}>
                  {(catalogModelsByBrand[planMarca] ?? []).map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>

              {/* Tipo de Producto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Producto</label>
                <select value={planTipo} onChange={(e) => setPlanTipo(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#001e6c] focus:outline-none">
                  {catalogTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Tipo de Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Destino</label>
                <select value={planTipoDestino} onChange={(e) => setPlanTipoDestino(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#001e6c] focus:outline-none">
                  {TIPOS_DESTINO_PLAN.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* Cantidad */}
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad</label><input type="number" min="1" max="100" value={planCantidad} onChange={(e) => setPlanCantidad(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#001e6c] focus:outline-none font-bold" /></div>
              <div className="pt-4 flex justify-end space-x-2 border-t">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#001e6c] hover:bg-[#00155a] text-white font-bold rounded text-xs shadow-md">Crear Plan e Iniciar Escaneo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA CONDUCE */}
      {selectedConduce && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden border">
            <div className="bg-[#001e6c] text-white px-6 py-4 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center"><Printer className="w-4 h-4 mr-2 text-amber-400" />CONDUCE LISTO PARA IMPRESIÓN</span>
              <button onClick={() => setSelectedConduce(null)} className="text-white hover:text-amber-400 text-xl font-bold">&times;</button>
            </div>
            <div className="p-8" id="printable-conduce">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">CONDUCE DE DESPACHO DE EQUIPOS</h1>
                </div>
                <div className="text-right">
                  <div className="bg-slate-100 border-2 border-slate-900 rounded p-2 inline-block"><p className="text-[9px] font-bold text-slate-600">NÚMERO CORRELATIVO</p><p className="text-base font-black font-mono text-emerald-700">{selectedConduce.id}</p></div>
                  <p className="text-[10px] text-slate-500 mt-2">Fecha / Hora: <strong className="text-slate-800">{selectedConduce.fecha}</strong></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200 mb-6 text-xs">
                {/* ── Centro Emisor ── */}
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Centro Emisor</h3>
                  <p className="font-black text-slate-900 text-[12px]">Tech Corps Guatemala</p>
                  <p className="text-[10px] text-slate-500 mb-1">Lunes a Viernes · 8:00 AM – 5:00 PM</p>
                  <p className="text-[10px] text-slate-700 leading-tight">Blvd. Bosque de San Nicolás, Col. El Naranjo</p>
                  <p className="text-[10px] text-slate-700 leading-tight">7 Calle 24-53, Bodega 9, Zona 4 de Mixco</p>
                  <p className="text-[10px] text-slate-600 mt-1">Tel: <span className="font-semibold">+502 2436 0336 / 2254 0430</span></p>
                  <p className="text-[10px] text-slate-600">WhatsApp: <span className="font-semibold">+502 3576 8476</span></p>
                  <a href="https://maps.app.goo.gl/CZHWCBQQY6A8HuZg8" target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 underline mt-0.5 inline-block">Ver en Google Maps</a>
                </div>
                {/* ── Datos de envío ── */}
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Datos de Envío</h3>
                  <p className="text-[11px] text-slate-600">Courrier: <span className="font-semibold text-slate-900">{selectedConduce.courrier}</span></p>
                  <p className="text-[11px] text-slate-600">Guía: <span className="font-mono font-bold">{selectedConduce.numeroGuia || 'N/A'}</span></p>
                  <p className="text-[11px] text-slate-600">Precinto: <span className="font-mono font-bold">{selectedConduce.precinto || 'Sin Precinto'}</span></p>
                  <p className="text-[11px] text-slate-600">Tipo de Ingreso: <span className="font-semibold text-slate-900">{selectedConduce.operador !== '--OPERADOR--' ? selectedConduce.operador : '—'}</span></p>
                  <p className="text-[11px] text-slate-600">Canal / Agencia: <span className="font-semibold text-slate-900">{selectedConduce.dealer || selectedConduce.retail || selectedConduce.origen || '—'}</span></p>
                  {selectedConduce.sucursal && <p className="text-[11px] text-slate-600">Sucursal: <span className="font-semibold text-slate-900">{selectedConduce.sucursal}</span></p>}
                  <p className="text-[11px] text-slate-600 mt-1">Total unidades: <span className="font-bold text-emerald-700">{selectedConduce.unidadesDespachadas.length}</span></p>
                  <p className="text-[11px] text-slate-600">DOA: <strong>{selectedConduce.doa ? 'SÍ' : 'NO'}</strong></p>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#001e6c] mb-2 border-b pb-1">Detalle de Entrega</h3>
                <table className="w-full text-left border-collapse border text-[11px]">
                  <thead><tr className="bg-slate-100 border-b text-slate-800 font-bold uppercase"><th className="p-2 border text-center w-10">No.</th><th className="p-2 border">IMEI / Serial</th><th className="p-2 border">No. Orden</th><th className="p-2 border">Grupo</th><th className="p-2 border">Marca</th><th className="p-2 border">Modelo</th><th className="p-2 border">Agencia</th><th className="p-2 border text-center">Estatus</th></tr></thead>
                  <tbody>
                    {selectedConduce.unidadesDespachadas.map((u, i) => (
                      <tr key={u.imei} className="border-b">
                        <td className="p-2 border text-center font-bold text-slate-500">{i + 1}</td>
                        <td className="p-2 border font-mono font-bold text-emerald-700">{u.imei}</td>
                        <td className="p-2 border font-mono font-bold text-[#001e6c] whitespace-nowrap">{u.ordenNumero || '—'}</td>
                        <td className="p-2 border text-slate-600 text-[10px]">{u.grupo || '—'}</td>
                        <td className="p-2 border font-bold text-slate-900">{u.marca}</td>
                        <td className="p-2 border text-slate-700">{u.modelo}</td>
                        <td className="p-2 border text-slate-600">{u.agencia || 'Por Defecto'}</td>
                        <td className="p-2 border text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${estadoBadgeClass(u.estado)}`}>{u.estado.toUpperCase().startsWith('PARA DEVOLVER') || u.estado.toUpperCase() === 'NOTA DE CREDITO VALIDACION SAP' ? 'ENTREGADO' : u.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedConduce.unidadesDevolver.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 mb-2 border-b pb-1">Planes de Devolución ({selectedConduce.unidadesDevolver.reduce((a, p) => a + p.series.length, 0)} series)</h3>
                  <table className="w-full text-left border-collapse border text-[11px]">
                    <thead><tr className="bg-red-50 border-b text-red-800 font-bold uppercase"><th className="p-2 border text-center w-10">No.</th><th className="p-2 border">Lote</th><th className="p-2 border">Agencia</th><th className="p-2 border text-center">Esperada</th><th className="p-2 border text-center">Escaneada</th><th className="p-2 border">Series</th></tr></thead>
                    <tbody>
                      {selectedConduce.unidadesDevolver.map((u, i) => (
                        <tr key={u.id} className="border-b">
                          <td className="p-2 border text-center font-bold text-slate-500">{i + 1}</td>
                          <td className="p-2 border font-bold text-slate-900">{u.marca} {u.modelo} ({u.tipo})</td>
                          <td className="p-2 border">{u.agencia}</td>
                          <td className="p-2 border text-center">{u.cantidad}</td>
                          <td className="p-2 border text-center font-bold text-emerald-700">{u.escaneados}</td>
                          <td className="p-2 border font-mono text-[9px] text-red-700">{u.series.join(', ') || 'Ninguno'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 pt-10 mt-10 text-center text-[10px]">
                <div className="border-t border-slate-400 pt-2"><p className="font-bold text-slate-800">Despachador Autorizado</p><p className="text-slate-500 mt-1">Firma / Sello Bodega</p></div>
                <div className="border-t border-slate-400 pt-2"><p className="font-bold text-slate-800">Recibido Conforme</p><p className="text-slate-500 mt-1">Firma / Sello Sucursal</p></div>
              </div>
            </div>
            <div className="bg-slate-100 px-6 py-4 flex justify-end space-x-3 border-t">
              <button onClick={() => window.print()} className="px-4 py-2 bg-[#001e6c] hover:bg-[#00155a] text-white text-xs font-bold rounded transition flex items-center"><Printer className="w-4 h-4 mr-2 text-amber-400" />Imprimir Conduce</button>
              <button onClick={() => setSelectedConduce(null)} className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded transition">Cerrar Vista</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
