/** Fetch same-origin con cookies de sesión Supabase (App Router). */
export function separacionSapFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
    cache: init?.cache ?? 'no-store',
  });
}

export function isAuthErrorMessage(message: string): boolean {
  return /no autenticado|unauthorized|401/i.test(message);
}

export function redirectToLoginFromSeparacionSap(): void {
  if (typeof window === 'undefined') return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?redirect=${redirect}`);
}
