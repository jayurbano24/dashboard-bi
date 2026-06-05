import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Rutas públicas (no requieren login)
const PUBLIC_PATHS = ['/login', '/auth/callback'];

// Rutas que requieren rol 'admin'
const ADMIN_PATHS = ['/admin'];

// Rutas permitidas por rol
const ROLE_ACCESS: Record<string, string[]> = {
  admin:      ['/', '/despacho', '/admin'],
  supervisor: ['/', '/despacho'],
  despacho:   ['/despacho'],
  viewer:     ['/'],
};

function normalizeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function hasArea(accessibleAreas: string[], expectedArea: string): boolean {
  const expected = normalizeText(expectedArea);
  return accessibleAreas.some((area) => normalizeText(area) === expected);
}

function canAccess(role: string | null, pathname: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ACCESS[normalizeText(role)] ?? [];
  return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas y assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname === '/no-access' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, supabase } = await updateSession(request);

  // No autenticado → redirigir al login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Obtener rol del usuario
  const { data: roleData } = await supabase.rpc('get_my_role');

  const { data: areasData } = await supabase.rpc('get_my_accessible_areas');

  const role = typeof roleData === 'string' ? normalizeText(roleData) : null;
  let accessibleAreas = Array.isArray(areasData) ? areasData : [];

  if (role && role !== 'admin' && accessibleAreas.length === 0) {
    const { data: fallbackAreas } = await supabase
      .from('role_area_access')
      .select('area')
      .eq('role', role);

    accessibleAreas = Array.isArray(fallbackAreas)
      ? fallbackAreas
          .map((row: { area: string | null }) => row.area)
          .filter((area): area is string => typeof area === 'string' && area.length > 0)
      : [];
  }

  // Sin rol asignado → solo puede ver /login y página de sin acceso
  if (!role) {
    if (pathname === '/no-access') return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = '/no-access';
    return NextResponse.redirect(url);
  }

  // Verificar si puede acceder a la ruta
  if (pathname.startsWith('/despacho') && role !== 'admin' && !hasArea(accessibleAreas, 'Despacho')) {
    const url = request.nextUrl.clone();
    url.pathname = '/no-access';
    return NextResponse.redirect(url);
  }

  if (!canAccess(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/no-access';
    return NextResponse.redirect(url);
  }

  // Inyectar rol en header para uso en server components
  supabaseResponse.headers.set('x-user-role', role);
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
