export type SupabaseRestHeaders = Record<string, string>;

export function supabaseHeaders(serviceKey: string, extra: SupabaseRestHeaders = {}): SupabaseRestHeaders {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

export async function fetchAllRows<T extends Record<string, unknown>>(
  sbUrl: string,
  serviceKey: string,
  table: string,
  select: string,
  filter = '',
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const res = await fetch(
      `${sbUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${pageSize}&offset=${offset}${filter}`,
      { headers: supabaseHeaders(serviceKey) },
    );
    if (!res.ok) {
      throw new Error(`${table} fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const rows = (await res.json()) as T[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

export async function deleteByIds(
  sbUrl: string,
  serviceKey: string,
  table: string,
  ids: string[],
): Promise<void> {
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const filter = chunk.map((id) => `"${id}"`).join(',');
    const res = await fetch(`${sbUrl}/rest/v1/${table}?id=in.(${filter})`, {
      method: 'DELETE',
      headers: supabaseHeaders(serviceKey, { Prefer: 'return=minimal' }),
    });
    if (!res.ok) {
      throw new Error(`${table} delete ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
  }
}
