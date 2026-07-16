'use client';

type Props = {
  batchCount: number;
  saving: boolean;
  lastSavedLoteId: string | null;
  canDispatch: boolean;
  onSave: () => void;
  onDispatch: () => void;
};

export function SAPFooter({ batchCount, saving, lastSavedLoteId, canDispatch, onSave, onDispatch }: Props) {
  return (
    <div className="space-y-3 mt-6">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || batchCount === 0}
        className="relative overflow-hidden group w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando lote...
            </>
          ) : (
            <>
              <span className="text-xl">💾</span> 
              Guardar {batchCount} {batchCount === 1 ? 'Equipo' : 'Equipos'} en Supabase (SAP)
            </>
          )}
        </span>
      </button>

      {lastSavedLoteId && (
        <button
          type="button"
          onClick={onDispatch}
          disabled={!canDispatch || saving}
          className="relative overflow-hidden group w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] animate-in slide-in-from-bottom-2 fade-in duration-300"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="text-xl group-hover:translate-x-1 transition-transform">🚚</span> 
            Registrar Salida de Lote
          </span>
        </button>
      )}
    </div>
  );
}
