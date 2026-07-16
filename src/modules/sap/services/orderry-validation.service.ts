/**
 * Encapsula la validación IMEI existente sin modificar la ruta /api/despacho/imei-lookup.
 */
import type { OrderryValidationDto } from '../../application/dtos';

export class OrderryValidationService {
  constructor(private readonly baseUrl: string) {}

  async validateImei(imei: string, cookieHeader?: string): Promise<OrderryValidationDto> {
    const url = `${this.baseUrl}/api/despacho/imei-lookup?imei=${encodeURIComponent(imei.trim())}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(typeof body?.error === 'string' ? body.error : `Orderry lookup HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      found: Boolean(data.found),
      orderId: data.orderId ?? null,
      marca: String(data.marca ?? ''),
      modelo: String(data.modelo ?? ''),
      producto: String(data.producto ?? ''),
      rawStatus: String(data.rawStatus ?? ''),
      estadoGanado: String(data.estadoGanado ?? ''),
      ordenNumero: data.ordenNumero ? String(data.ordenNumero) : undefined,
      cliente: data.cliente ? String(data.cliente) : undefined,
      canalIngreso: data.canalIngreso ? String(data.canalIngreso) : undefined,
    };
  }
}
