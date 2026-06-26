'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AccessRow = {
  id: string;
  role: string;
  area: string;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  despacho: 'Despacho',
  viewer: 'Solo lectura',
};

const ALL_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'] as const;
const ALL_AREAS = ['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'ERP Xiaomi', 'Bono Técnico', 'Despacho'] as const;

export default function AdminAreasClient({ initialAccess }: { initialAccess: AccessRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [access, setAccess] = useState<AccessRow[]>(initialAccess);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const accessByRole = useMemo(() => {
    return ALL_ROLES.reduce<Record<string, string[]>>((acc, role) => {
      acc[role] = access.filter((row) => row.role === role).map((row) => row.area);
      return acc;
    }, {});
  }, [access]);

  async function saveRoleAreas(role: string, areas: string[]) {
    setSavingRole(role);
    const res = await fetch('/api/admin/areas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, areas }),
    });

    const json = await res.json();
    if (res.ok) {
      const newAreas = Array.isArray(json.areas) ? json.areas : [];
      setAccess((prev) => [
        ...prev.filter((row) => row.role !== role),
        ...newAreas.map((area: string) => ({
          id: `${role}:${area}`,
          role,
          area,
          created_at: new Date().toISOString(),
        })),
      ]);
      setMessage({ type: 'ok', text: `Áreas de ${ROLE_LABELS[role] ?? role} actualizadas.` });
      router.refresh();
    } else {
      setMessage({ type: 'err', text: json.error ?? 'No se pudo actualizar.' });
    }
    setSavingRole(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function toggleArea(role: string, area: string) {
    const current = accessByRole[role] ?? [];
    const next = current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area];

    setAccess((prev) => {
      const preserved = prev.filter((row) => row.role !== role);
      const regenerated = next.map((item: string) => ({
        id: `${role}:${item}`,
        role,
        area: item,
        created_at: new Date().toISOString(),
      }));

      return [...preserved, ...regenerated];
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/users" className="text-gray-400 hover:text-white transition-colors text-sm">← Usuarios</a>
            <span className="text-gray-700">/</span>
            <span className="text-white font-semibold text-sm">Áreas por rol</span>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-sm transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">Áreas permitidas por rol</h1>
        <p className="text-gray-400 text-sm mb-6">Administra qué áreas puede ver cada rol. Admin siempre ve todo.</p>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl border text-sm ${message.type === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-6">
          {ALL_ROLES.map((role) => (
            <div key={role} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{ROLE_LABELS[role] ?? role}</h2>
                  <p className="text-xs text-gray-500">Selecciona las áreas visibles para este rol.</p>
                </div>
                <button
                  onClick={() => saveRoleAreas(role, accessByRole[role] ?? [])}
                  disabled={savingRole === role}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingRole === role ? 'Guardando...' : 'Guardar'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_AREAS.map((area) => {
                  const active = (accessByRole[role] ?? []).includes(area);
                  return (
                    <label
                      key={area}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-gray-950 hover:border-gray-700'}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleArea(role, area)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500"
                      />
                      <span className="text-sm text-gray-200">{area}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}