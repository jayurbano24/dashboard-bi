#!/usr/bin/env node
/**
 * Muestra la ruta del SQL de Separación SAP y opcionalmente lo aplica con psql
 * si DATABASE_URL está definida en el entorno.
 *
 * Uso:
 *   node scripts/apply-separacion-sap-migration.mjs
 *   $env:DATABASE_URL="postgresql://..." ; node scripts/apply-separacion-sap-migration.mjs --apply
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, 'migrations', '2026-separacion-sap-cajas.sql');
const apply = process.argv.includes('--apply');
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

console.log('\n=== Migración Separación SAP ===\n');
console.log('Archivo SQL:', sqlPath);
console.log('\nPasos manuales (recomendado):');
console.log('  1. Supabase Dashboard → SQL Editor → New query');
console.log('  2. Copiar y pegar el contenido del archivo anterior');
console.log('  3. Run');
console.log('  4. Verificar en Table Editor las tablas separacion_sap_*');
console.log('  5. En la app (logueado): GET /api/separacion-sap/schema\n');

console.log('Tablas que se crean:');
[
  'separacion_sap_bsd_equipos   → Inventario series del Excel SAP',
  'separacion_sap_marcas        → Catálogo marcas',
  'separacion_sap_modelos       → Catálogo modelos / reglas escaneo',
  'separacion_sap_cajas         → Cajas PX',
  'separacion_sap_capturas      → Series capturadas por caja',
  'separacion_sap_rechazos      → Auditoría rechazos scanner',
  'separacion_sap_bsd_imports   → Log de cargas Excel SAP',
].forEach((line) => console.log('  •', line));

if (!apply) {
  console.log('\nPara aplicar automáticamente con psql:');
  console.log('  $env:DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"');
  console.log('  node scripts/apply-separacion-sap-migration.mjs --apply\n');
  process.exit(0);
}

if (!databaseUrl) {
  console.error('\nError: defina DATABASE_URL o SUPABASE_DB_URL para --apply\n');
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
const psql = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], {
  encoding: 'utf8',
  stdio: 'pipe',
});

if (psql.status !== 0) {
  console.error('\npsql falló:', psql.stderr || psql.stdout);
  console.error('\nAplique el SQL manualmente en Supabase SQL Editor.\n');
  process.exit(psql.status ?? 1);
}

console.log('\nMigración aplicada correctamente.');
console.log('Registros procesados:', sql.split('\n').length, 'líneas SQL\n');
