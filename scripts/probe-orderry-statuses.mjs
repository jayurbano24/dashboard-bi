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

const baseUrl = env.ORDERRY_API_URL || 'https://api.orderry.com';
const apiKey = env.ORDERRY_API_KEY;
if (!apiKey) {
  console.error('ORDERRY_API_KEY missing');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };

for (const ep of ['/v2/orders/statuses', '/v2/order-statuses', '/v2/statuses']) {
  try {
    const r = await fetch(`${baseUrl}${ep}`, { headers });
    const text = await r.text();
    console.log(`\n=== ${ep} → HTTP ${r.status} ===`);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      console.log(text.slice(0, 500));
      continue;
    }
    const arr = Array.isArray(body) ? body : body?.data || body?.statuses || [];
    console.log('shape:', Array.isArray(body) ? 'array' : Object.keys(body || {}).join(', '));
    console.log('count:', Array.isArray(arr) ? arr.length : 'n/a');
    if (Array.isArray(arr) && arr.length > 0) {
      console.log('keys[0]:', Object.keys(arr[0]).join(', '));
      const groups = [...new Set(arr.map((s) => s.group?.name).filter(Boolean))].sort();
      console.log('unique groups:', groups.join(' | '));
      console.log('sample[0]:', JSON.stringify(arr[0], null, 2));
      if (arr.length > 1) console.log('sample[1]:', JSON.stringify(arr[1], null, 2));
    } else {
      console.log(JSON.stringify(body, null, 2).slice(0, 1200));
    }
  } catch (e) {
    console.log(ep, e.message);
  }
}
