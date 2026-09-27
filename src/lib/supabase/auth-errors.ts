/** Errores de Supabase Auth cuando el refresh token en cookies ya no existe en el servidor. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = String((error as { message?: string }).message ?? '').toLowerCase();
  const code = String((error as { code?: string }).code ?? '').toLowerCase();

  return (
    message.includes('refresh token') ||
    message.includes('invalid refresh') ||
    code === 'refresh_token_not_found'
  );
}
