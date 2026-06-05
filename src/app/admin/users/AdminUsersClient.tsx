'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type RoleRow = {
  user_id: string;
  email: string;
  role: string | null;
  status: 'active' | 'invited';
  created_at: string;
  first_name: string | null;
  last_name: string | null;
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:      { label: 'Administrador', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  supervisor: { label: 'Supervisor',    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  despacho:   { label: 'Despacho',      color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  viewer:     { label: 'Solo lectura',  color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
};

const ALL_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'] as const;
const ALL_AREAS = ['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'Claims', 'Subir Claims', 'Bono Técnico', 'Despacho'] as const;

type AccessRow = {
  id: string;
  role: string;
  area: string;
  created_at: string;
};

export default function AdminUsersClient({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: RoleRow[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [roles, setRoles] = useState<RoleRow[]>(initialUsers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<string>('viewer');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState<string | null>(null);
  const [passwordEditorUserId, setPasswordEditorUserId] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');

  const accessByRole = useMemo(() => {
    return ALL_ROLES.reduce<Record<string, string[]>>((acc, role) => {
      acc[role] = access.filter((row) => row.role === role).map((row) => row.area);
      return acc;
    }, {});
  }, [access]);

  useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      const res = await fetch('/api/admin/areas', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (cancelled) return;
      setAccess(Array.isArray(json.access) ? json.access : []);
    };

    loadAccess();
    return () => { cancelled = true; };
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    setLoading(userId);
    const res = await fetch('/api/admin/users/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    });
    const json = await res.json();
    if (res.ok) {
      setRoles((prev) => prev.map((r) => r.user_id === userId ? { ...r, role: newRole } : r));
      setMessage({ type: 'ok', text: 'Rol actualizado correctamente.' });
    } else {
      setMessage({ type: 'err', text: json.error ?? 'Error al actualizar rol.' });
    }
    setLoading(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleRemoveUser(userId: string) {
    if (userId === currentUserId) {
      setMessage({ type: 'err', text: 'No puedes quitarte el acceso a ti mismo.' });
      return;
    }
    if (!confirm('¿Eliminar acceso de este usuario?')) return;
    setLoading('del-' + userId);
    const res = await fetch('/api/admin/users/role', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      setRoles((prev) => prev.map((r) => r.user_id === userId ? { ...r, role: '' } : r));
      setMessage({ type: 'ok', text: 'Acceso removido. Usuario sin rol.' });
    } else {
      setMessage({ type: 'err', text: 'Error al eliminar usuario.' });
    }
    setLoading(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading('invite');
    const res = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const json = await res.json();
    if (res.ok) {
      setMessage({ type: 'ok', text: `Invitación enviada a ${inviteEmail}.` });
      setInviteEmail('');
      router.refresh();
    } else {
      setMessage({ type: 'err', text: json.error ?? 'Error al invitar usuario.' });
    }
    setLoading(null);
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading('create');

    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        first_name: createFirstName.trim(),
        last_name: createLastName.trim(),
      }),
    });

    const json = await res.json();
    if (res.ok) {
      setMessage({ type: 'ok', text: `Usuario ${createEmail.trim()} creado correctamente.` });
      const createdUser = json?.user as RoleRow | undefined;
      if (createdUser?.user_id) {
        setRoles((prev) => {
          const exists = prev.some((row) => row.user_id === createdUser.user_id);
          if (exists) {
            return prev.map((row) => (row.user_id === createdUser.user_id ? { ...row, ...createdUser } : row));
          }
          return [createdUser, ...prev];
        });
      } else {
        router.refresh();
      }
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('viewer');
      setCreateFirstName('');
      setCreateLastName('');
    } else {
      setMessage({ type: 'err', text: json.error ?? 'No se pudo crear el usuario.' });
    }

    setLoading(null);
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleSetPassword(userId: string) {
    const trimmed = passwordDraft.trim();
    if (trimmed.length < 8) {
      setMessage({ type: 'err', text: 'La contraseña debe tener al menos 8 caracteres.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(`pwd-${userId}`);
    const res = await fetch('/api/admin/users/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: trimmed }),
    });

    const json = await res.json();
    if (res.ok) {
      setMessage({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
      setPasswordEditorUserId(null);
      setPasswordDraft('');
    } else {
      setMessage({ type: 'err', text: json.error ?? 'No se pudo actualizar la contraseña.' });
    }

    setLoading(null);
    setTimeout(() => setMessage(null), 3500);
  }

  function updateProfileField(userId: string, field: 'first_name' | 'last_name', value: string) {
    setRoles((prev) => prev.map((row) => row.user_id === userId ? { ...row, [field]: value } : row));
  }

  async function saveProfileName(userId: string) {
    const target = roles.find((row) => row.user_id === userId);
    if (!target) return;

    const firstName = (target.first_name ?? '').trim();
    const lastName = (target.last_name ?? '').trim();

    if (!firstName || !lastName) {
      setMessage({ type: 'err', text: 'Nombre y apellido son obligatorios.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSavingProfile(userId);
    const res = await fetch('/api/admin/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, first_name: firstName, last_name: lastName }),
    });

    const json = await res.json();
    if (res.ok) {
      setMessage({ type: 'ok', text: 'Nombre actualizado correctamente.' });
    } else {
      setMessage({ type: 'err', text: json.error ?? 'No se pudo guardar el nombre.' });
    }

    setSavingProfile(null);
    setTimeout(() => setMessage(null), 3000);
  }

  function toggleArea(role: string, area: string) {
    if (role === 'admin') return;

    const current = accessByRole[role] ?? [];
    const next = current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area];

    setAccess((prev) => {
      const preserved = prev.filter((row) => row.role !== role);
      return [
        ...preserved,
        ...next.map((item) => ({
          id: `${role}:${item}`,
          role,
          area: item,
          created_at: new Date().toISOString(),
        })),
      ];
    });
  }

  async function saveRoleAreas(role: string) {
    if (role === 'admin') {
      setMessage({ type: 'ok', text: 'El rol admin siempre tiene acceso a todas las áreas.' });
      return;
    }

    setSavingRole(role);
    const res = await fetch('/api/admin/areas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, areas: accessByRole[role] ?? [] }),
    });

    const json = await res.json();
    if (res.ok) {
      setAccess((prev) => {
        const preserved = prev.filter((row) => row.role !== role);
        const areas = Array.isArray(json.areas) ? json.areas : [];
        return [
          ...preserved,
          ...areas.map((area: string) => ({
            id: `${role}:${area}`,
            role,
            area,
            created_at: new Date().toISOString(),
          })),
        ];
      });
      setMessage({ type: 'ok', text: `Áreas de ${ROLE_LABELS[role]?.label ?? role} actualizadas.` });
    } else {
      setMessage({ type: 'err', text: json.error ?? 'No se pudo actualizar las áreas.' });
    }
    setSavingRole(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Dashboard
            </a>
            <span className="text-gray-700">/</span>
            <span className="text-white font-semibold text-sm">Gestión de usuarios</span>
            <span className="text-gray-700">/</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 text-sm transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">Usuarios y Roles</h1>
        <p className="text-gray-400 text-sm mb-8">Gestiona qué usuarios tienen acceso y qué pueden ver.</p>

        {/* Mensaje feedback */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl border text-sm
            ${message.type === 'ok'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">Usuarios con acceso</h2>
          </div>

          {roles.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              No hay usuarios registrados aún.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {roles.map((row) => {
                const rl = row.role
                  ? (ROLE_LABELS[row.role] ?? { label: row.role, color: 'bg-gray-600/20 text-gray-300 border-gray-600/30' })
                  : { label: 'Sin rol', color: 'bg-gray-600/20 text-gray-300 border-gray-600/30' };
                const isMe = row.user_id === currentUserId;
                return (
                  <div key={row.user_id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-100 truncate">
                          {(row.first_name || row.last_name)
                            ? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
                            : 'Sin nombre asignado'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${row.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                          {row.status === 'active' ? 'Activo' : 'Invitado'}
                        </span>
                        {isMe && <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">Tú</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {row.email || 'Sin correo disponible'} · Desde {new Date(row.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={row.first_name ?? ''}
                          onChange={(e) => updateProfileField(row.user_id, 'first_name', e.target.value)}
                          placeholder="Nombre"
                          className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={row.last_name ?? ''}
                          onChange={(e) => updateProfileField(row.user_id, 'last_name', e.target.value)}
                          placeholder="Apellido"
                          className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => saveProfileName(row.user_id)}
                          disabled={savingProfile === row.user_id}
                          className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                        >
                          {savingProfile === row.user_id ? 'Guardando...' : 'Guardar nombre'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full border font-medium ${rl.color}`}>{row.role ? rl.label : 'Sin rol'}</span>

                      {passwordEditorUserId === row.user_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={passwordDraft}
                            onChange={(e) => setPasswordDraft(e.target.value)}
                            placeholder="Nueva contraseña"
                            className="w-36 rounded-lg border border-amber-500/40 bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetPassword(row.user_id)}
                            disabled={loading === `pwd-${row.user_id}`}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            {loading === `pwd-${row.user_id}` ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordEditorUserId(null);
                              setPasswordDraft('');
                            }}
                            className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordEditorUserId(row.user_id);
                            setPasswordDraft('');
                          }}
                          disabled={loading === `pwd-${row.user_id}`}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          Cambiar contraseña
                        </button>
                      )}

                      <select
                        value={row.role || ''}
                        disabled={loading === row.user_id}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) {
                            handleRemoveUser(row.user_id);
                            return;
                          }
                          handleRoleChange(row.user_id, value);
                        }}
                        className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="">Sin rol</option>
                        <option value="admin">Administrador</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="despacho">Despacho</option>
                        <option value="viewer">Solo lectura</option>
                      </select>

                      {!isMe && (
                        <button
                          onClick={() => handleRemoveUser(row.user_id)}
                          disabled={loading === 'del-' + row.user_id}
                          className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Eliminar acceso"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invitar usuario */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-sm text-gray-300 uppercase tracking-wider mb-4">Invitar nuevo usuario</h2>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="admin">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="despacho">Despacho</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <button
              type="submit"
              disabled={loading === 'invite'}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold
                         rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              {loading === 'invite' ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </form>
          <p className="text-gray-600 text-xs mt-3">
            El usuario recibirá un email para crear su contraseña. El acceso se activará al confirmar su cuenta.
          </p>

          <div className="mt-6 border-t border-gray-800 pt-6">
            <h3 className="font-semibold text-sm text-gray-300 uppercase tracking-wider mb-4">Crear usuario con contraseña</h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={createFirstName}
                onChange={(e) => setCreateFirstName(e.target.value)}
                placeholder="Nombre"
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                required
                value={createLastName}
                onChange={(e) => setCreateLastName(e.target.value)}
                placeholder="Apellido"
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="correo@empresa.com"
                className="md:col-span-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="password"
                required
                minLength={8}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Contraseña temporal (mínimo 8 caracteres)"
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="admin">Administrador</option>
                <option value="supervisor">Supervisor</option>
                <option value="despacho">Despacho</option>
                <option value="viewer">Solo lectura</option>
              </select>
              <button
                type="submit"
                disabled={loading === 'create'}
                className="md:col-span-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {loading === 'create' ? 'Creando...' : 'Crear usuario'}
              </button>
            </form>
            <p className="text-gray-600 text-xs mt-3">
              Crea al usuario inmediatamente con contraseña definida desde esta pantalla.
            </p>
          </div>
        </div>

        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">Áreas por rol</h2>
              <p className="text-xs text-gray-500 mt-1">Administra dentro de esta misma pantalla qué áreas ve cada rol.</p>
            </div>
          </div>

          <div className="grid gap-6">
            {ALL_ROLES.map((role) => (
              <div key={role} className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{ROLE_LABELS[role].label}</h3>
                    <p className="text-xs text-gray-500">
                      {role === 'admin'
                        ? 'Acceso total a todas las áreas.'
                        : 'Selecciona las áreas permitidas para este rol.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveRoleAreas(role)}
                    disabled={savingRole === role || role === 'admin'}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {role === 'admin' ? 'Siempre total' : savingRole === role ? 'Guardando...' : 'Guardar áreas'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ALL_AREAS.map((area) => {
                    const active = role === 'admin' || (accessByRole[role] ?? []).includes(area);
                    return (
                      <label
                        key={area}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-gray-950 hover:border-gray-700'}`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={role === 'admin'}
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
    </div>
  );
}
