'use client';

import { useMemo, useState } from 'react';

type Props = {
  agencies: string[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export function AgencySelector({ agencies, value, onChange, loading }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agencies;
    return agencies.filter((a) => a.toLowerCase().includes(q));
  }, [agencies, query]);

  return (
    <div>
      <label className="block font-bold text-slate-700 uppercase mb-1 text-xs">Agencia</label>
      <input
        type="text"
        placeholder="Buscar agencia..."
        value={query || value}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setQuery(value)}
        className="w-full p-2 border border-slate-300 rounded font-bold text-xs mb-1"
        list="sap-agencies-list"
        required
      />
      <datalist id="sap-agencies-list">
        {filtered.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      {loading && <p className="text-[10px] text-blue-600">Cargando catálogo...</p>}
    </div>
  );
}
