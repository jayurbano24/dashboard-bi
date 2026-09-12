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

const r = await fetch(`${env.ORDERRY_API_URL || 'https://api.orderry.com'}/v2/orders/statuses`, {
  headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}`, Accept: 'application/json' },
});
const arr = await r.json();
arr.sort((a, b) => a.group.name.localeCompare(b.group.name) || a.name.localeCompare(b.name));
for (const s of arr) {
  console.log(`${s.group.name}\t${s.id}\t${s.name}`);
}
