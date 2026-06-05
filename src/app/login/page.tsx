'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const AREA_OPTIONS = ['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'Claims', 'Subir Claims', 'Bono Técnico', 'Despacho'];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_callback_failed' ? 'Error de autenticación. Intenta de nuevo.' : null
  );
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  // Si ya hay sesión activa, redirigir
  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          // Evita ruido en consola cuando el refresh token local está vencido o ausente.
          const message = String(error.message || '').toLowerCase();
          if (message.includes('refresh token')) {
            await supabase.auth.signOut({ scope: 'local' });
          }
          return;
        }

        if (!cancelled && data?.session) {
          router.replace(redirect);
        }
      } catch {
        // Fallback defensivo para casos de sesión local corrupta.
        await supabase.auth.signOut({ scope: 'local' });
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [router, redirect, supabase]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.replace(redirect);
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Nombre y apellido son obligatorios.');
      setLoading(false);
      return;
    }

    if (selectedAreas.length === 0) {
      setError('Selecciona al menos un área.');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          areas: selectedAreas,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    const session = data.session;

    if (session && userId) {
      await supabase.from('user_profiles').upsert(
        {
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          areas: selectedAreas,
        },
        { onConflict: 'user_id' }
      );
      await supabase.from('user_roles').upsert(
        { user_id: userId, role: 'viewer' },
        { onConflict: 'user_id' }
      );
      router.replace(redirect);
      router.refresh();
      return;
    }

    setSuccess('Cuenta creada. Revisa tu correo para confirmar el acceso.');
    setLoading(false);
  }

  function toggleArea(area: string) {
    setSelectedAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Dashboard BI</h1>
          <p className="text-gray-400 text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-300 text-sm text-center">{success}</p>
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 gap-2 bg-gray-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-5">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Nombre"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                      Apellido
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Apellido"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Áreas a las que pertenece
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AREA_OPTIONS.map((area) => {
                      const active = selectedAreas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleArea(area)}
                          className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${active ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'}`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-colors text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-colors text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                         text-white font-semibold rounded-xl transition-colors text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </span>
              ) : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Acceso restringido · Solo personal autorizado
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <LoginPageContent />
    </Suspense>
  );
}
