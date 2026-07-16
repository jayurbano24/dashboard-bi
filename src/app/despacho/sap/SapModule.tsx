'use client';

import { FileText } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { SapRazonNoOrderry } from '@/modules/sap/domain/sap-status';
import { DispatchModal } from './components/DispatchModal';
import { ReasonModal } from './components/ReasonModal';
import { SAPFooter } from './components/SAPFooter';
import { SAPHeader } from './components/SAPHeader';
import { SAPHistoryTable } from './components/SAPHistoryTable';
import { SAPLotTable } from './components/SAPLotTable';
import { SAPUnitForm } from './components/SAPUnitForm';
import {
  useDispatchSapLot,
  useSaveSapLot,
  useSapAgencies,
  useSapHistory,
  validateImeiApi,
} from './hooks/useSapApi';
import { SapQueryProvider } from './SapQueryProvider';
import type { DispatchFormData, OrderryLookupState, SapBatchItem, SapLotFormDefaults } from './types';
import { emptyLotDefaults, todayIso } from './types';

type ToastFn = (message: string, type?: string) => void;

function SapModuleInner({ onNotify, authRole }: { onNotify: ToastFn; authRole: string | null }) {
  const [lotDefaults, setLotDefaults] = useState<SapLotFormDefaults>(emptyLotDefaults);
  const [batch, setBatch] = useState<SapBatchItem[]>([]);
  const [lastSavedLoteId, setLastSavedLoteId] = useState<string | null>(null);
  const [lastSavedCount, setLastSavedCount] = useState(0);

  const [imei, setImei] = useState('');
  const [agencia, setAgencia] = useState('');
  const [noDocumento, setNoDocumento] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [comentario, setComentario] = useState('ACEPTADO');
  const [cliente, setCliente] = useState('');
  const [orderryStatus, setOrderryStatus] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [foundInOrderry, setFoundInOrderry] = useState(false);

  const [lookup, setLookup] = useState<OrderryLookupState>({ loading: false, result: null, error: '' });
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pendingImei, setPendingImei] = useState('');
  const [razon, setRazon] = useState<SapRazonNoOrderry | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [manualApproved, setManualApproved] = useState(false);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState<DispatchFormData>({
    fechaEntrega: todayIso(),
    conduce: '',
    transportista: '',
    recibidoPor: '',
    observaciones: '',
  });

  const agenciesQuery = useSapAgencies();

  const saveMutation = useSaveSapLot((loteId) => {
    setLastSavedLoteId(loteId);
    setLastSavedCount(batch.length);
    setBatch([]);
    onNotify(`Lote guardado correctamente (${loteId.slice(0, 8)}…)`, 'success');
  });

  const dispatchMutation = useDispatchSapLot(() => {
    setDispatchOpen(false);
    setLastSavedLoteId(null);
    onNotify('Salida registrada — equipos en ENTREGADO SAP.', 'success');
  });

  const resetUnitFields = useCallback(() => {
    setMarca('');
    setModelo('');
    setCliente('');
    setOrderryStatus('');
    setOrderId(null);
    setFoundInOrderry(false);
    setManualApproved(false);
    setRazon('');
    setObservaciones('');
    setLookup({ loading: false, result: null, error: '' });
  }, []);

  const handleImeiScan = useCallback(async (scanned: string) => {
    setLookup({ loading: true, result: null, error: '' });
    resetUnitFields();
    try {
      const result = await validateImeiApi(scanned);
      setLookup({ loading: false, result, error: '' });
      if (result.found) {
        setFoundInOrderry(true);
        setMarca(result.marca || '');
        setModelo(result.modelo || '');
        setCliente(result.cliente || '');
        setOrderryStatus(result.rawStatus || result.estadoGanado || '');
        setOrderId(result.orderId ?? null);
        if (result.canalIngreso && result.canalIngreso !== 'N/A') setAgencia(result.canalIngreso);
        if (result.ordenNumero) setNoDocumento(result.ordenNumero);
      } else {
        setPendingImei(scanned);
        setReasonOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error consultando Orderry';
      setLookup({ loading: false, result: null, error: msg });
    }
  }, [resetUnitFields]);

  const handleReasonConfirm = () => {
    setFoundInOrderry(false);
    setManualApproved(true);
    setReasonOpen(false);
    setImei(pendingImei);
  };

  const canAdd =
    Boolean(imei.trim()) &&
    Boolean(lotDefaults.material.trim()) &&
    Boolean(lotDefaults.fechaAceptacion) &&
    Boolean(agencia.trim()) &&
    Boolean(marca.trim()) &&
    Boolean(modelo.trim()) &&
    (foundInOrderry || manualApproved);

  const handleAddToBatch = () => {
    const cleanImei = imei.trim();
    if (!/^\d{14,16}$/.test(cleanImei)) {
      onNotify('IMEI debe tener entre 14 y 16 dígitos.', 'error');
      return;
    }
    if (!lotDefaults.material.trim()) {
      onNotify('Material SAP es obligatorio.', 'error');
      return;
    }
    if (batch.some((b) => b.imeiFisico === cleanImei)) {
      onNotify('IMEI duplicado en el lote.', 'error');
      return;
    }

    const item: SapBatchItem = {
      agencia: agencia.trim(),
      imeiFisico: cleanImei,
      noDocumento: noDocumento.trim(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      notaEntrega: lotDefaults.notaEntrega.trim(),
      comentario: comentario.trim() || 'ACEPTADO',
      material: lotDefaults.material.trim(),
      fechaAceptacion: lotDefaults.fechaAceptacion,
      numeroTraslado: lotDefaults.numeroTraslado.trim(),
      razonNoOrderry: foundInOrderry ? undefined : razon,
      observacionesNoOrderry: foundInOrderry ? undefined : observaciones,
      orderId,
      cliente,
      orderryStatus,
      foundInOrderry,
    };

    setBatch((prev) => [...prev, item]);
    onNotify('Equipo agregado correctamente', 'success');
    setImei('');
    resetUnitFields();
    setNoDocumento('');
  };

  const handleSave = () => {
    if (!batch.length) {
      onNotify('Agregue al menos un equipo al lote.', 'error');
      return;
    }
    saveMutation.mutate({ lotDefaults, equipos: batch }, {
      onError: (err) => onNotify(err.message, 'error'),
    });
  };

  const handleDispatch = () => {
    if (!lastSavedLoteId) return;
    if (!dispatchForm.conduce.trim()) {
      onNotify('Conduce es obligatorio.', 'error');
      return;
    }
    dispatchMutation.mutate({
      loteId: lastSavedLoteId,
      ...dispatchForm,
    }, {
      onError: (err) => onNotify(err.message, 'error'),
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
        <SAPHeader />
        <div className="p-6 md:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 bg-gradient-to-b from-transparent to-slate-50/50">
          <div className="xl:col-span-4">
            <SAPUnitForm
              lotDefaults={lotDefaults}
              onLotDefaultsChange={(p) => setLotDefaults((prev) => ({ ...prev, ...p }))}
              agencies={agenciesQuery.data || []}
              agenciesLoading={agenciesQuery.isLoading}
              imei={imei}
              onImeiChange={setImei}
              onImeiScanComplete={handleImeiScan}
              agencia={agencia}
              onAgenciaChange={setAgencia}
              noDocumento={noDocumento}
              onNoDocumentoChange={setNoDocumento}
              marca={marca}
              onMarcaChange={setMarca}
              modelo={modelo}
              onModeloChange={setModelo}
              comentario={comentario}
              onComentarioChange={setComentario}
              lookup={lookup}
              foundInOrderry={foundInOrderry}
              cliente={cliente}
              orderryStatus={orderryStatus}
              canAdd={canAdd}
              onSubmit={handleAddToBatch}
            />
          </div>

          <div className="xl:col-span-8 flex flex-col gap-6">
            <SAPLotTable items={batch} onRemove={(i) => setBatch((p) => p.filter((_, idx) => idx !== i))} onClear={() => setBatch([])} />
            <SAPFooter
              batchCount={batch.length}
              saving={saveMutation.isPending || dispatchMutation.isPending}
              lastSavedLoteId={lastSavedLoteId}
              canDispatch={Boolean(lastSavedLoteId)}
              onSave={handleSave}
              onDispatch={() => setDispatchOpen(true)}
            />
          </div>
        </div>
      </div>

      <ReasonModal
        open={reasonOpen}
        imei={pendingImei}
        razon={razon}
        observaciones={observaciones}
        onRazonChange={setRazon}
        onObservacionesChange={setObservaciones}
        onConfirm={handleReasonConfirm}
        onCancel={() => { setReasonOpen(false); setImei(''); }}
      />

      <DispatchModal
        open={dispatchOpen}
        saving={dispatchMutation.isPending}
        form={dispatchForm}
        onChange={(p) => setDispatchForm((prev) => ({ ...prev, ...p }))}
        onConfirm={handleDispatch}
        onClose={() => setDispatchOpen(false)}
        equiposCount={lastSavedCount || batch.length}
      />

      <SAPHistoryTable />
    </div>
  );
}

export function SapModule({ onNotify, authRole }: { onNotify: ToastFn; authRole: string | null }) {
  return (
    <SapQueryProvider>
      <SapModuleInner onNotify={onNotify} authRole={authRole} />
    </SapQueryProvider>
  );
}
