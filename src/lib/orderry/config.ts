import type { OrderryClientOptions } from './types';

const DEFAULT_BASE_URL = 'https://api.orderry.com';

export function getOrderryConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OrderryClientOptions {
  const apiKey = env.ORDERRY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ORDERRY_API_KEY no está configurada (Settings > API en Orderry).');
  }

  const baseUrl = (env.ORDERRY_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const minIntervalMs = Number(env.ORDERRY_MIN_INTERVAL_MS || '350');
  const maxRetries = Number(env.ORDERRY_MAX_RETRIES || '4');

  return {
    apiKey,
    baseUrl,
    minIntervalMs: Number.isFinite(minIntervalMs) && minIntervalMs > 0 ? minIntervalMs : 350,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 4,
  };
}
