import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const sb = env.NEXT_PUBLIC_SUPABASE_URL;
const k = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: k, Authorization: `Bearer ${k}` };

const all = [];
let offset = 0;
while (true) {
  const batch = await fetch(
    `${sb}/rest/v1/despacho_conduce_rows?select=order_id,order_name,status_live,operador&order_id=not.is.null&limit=500&offset=${offset}`,
    { headers: h },
  ).then((r) => r.json());
  if (!Array.isArray(batch) || !batch.length) break;
  all.push(...batch);
  if (batch.length < 500) break;
  offset += 500;
}

const claro = all.filter((r) => String(r.operador || '').toUpperCase() === 'OPERADOR').slice(0, 5);
console.log('Claro sample count', claro.length);

for (const r of claro) {
  const hist = await fetch(
    `${sb}/rest/v1/historial_movimientos?select=estado_nuevo,grupo_nuevo,origen,fecha_hora_cambio&orden_id=eq.${r.order_id}&order=fecha_hora_cambio.asc`,
    { headers: h },
  ).then((res) => res.json());
  console.log(`\n${r.order_name} live=${r.status_live}`);
  for (const x of hist || []) console.log(`  [${x.origen}] ${x.estado_nuevo} (${x.grupo_nuevo})`);
}

const devol = await fetch(
  `${sb}/rest/v1/estados_catalogo?select=status_id,estado&estado=ilike.*DEVOL*`,
  { headers: h },
).then((r) => r.json());
console.log('\nCatalog DEVOL:', devol);

for (const estado of ['EN REPARACION', 'PARA DEVOLU', 'ENTREGADO']) {
  const c = await fetch(`${sb}/rest/v1/historial_movimientos?select=count&estado_nuevo=ilike.*${estado}*`, {
    headers: { ...h, Prefer: 'count=exact' },
  });
  console.log(`historial ${estado}:`, c.headers.get('content-range'));
}

const paraRows = await fetch(
  `${sb}/rest/v1/despacho_conduce_rows?select=order_id,order_name,status_live&operador=eq.OPERADOR&or=(status_live.ilike.*PARA DEVOLU*,status_live.ilike.*DEVOLUCION CAMBIO*)&limit=5`,
  { headers: h },
).then((r) => r.json());

console.log('\n--- PARA DEVOLUCION / DEVOLUCION CAMBIO samples ---');
for (const r of paraRows || []) {
  const hist = await fetch(
    `${sb}/rest/v1/historial_movimientos?select=estado_nuevo,status_id_nuevo,grupo_nuevo,fecha_hora_cambio,origen&orden_id=eq.${r.order_id}&order=fecha_hora_cambio.asc`,
    { headers: h },
  ).then((res) => res.json());
  console.log(`\n${r.order_name} id=${r.order_id} live=${r.status_live}`);
  for (const x of hist || []) {
    console.log(`  [${x.origen}] ${x.estado_nuevo} id=${x.status_id_nuevo} grupo=${x.grupo_nuevo} @ ${x.fecha_hora_cambio?.slice(0, 16)}`);
  }
}
