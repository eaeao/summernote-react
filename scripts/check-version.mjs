/**
 * CI gate: the exported VERSION / CORE_VERSION literals must equal package.json's version.
 * Run `node scripts/sync-version.mjs` to fix drift.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

const checks = [
  ['src/index.ts', /export const VERSION: string = '([^']*)'/, 'VERSION'],
  ['src/engine/index.ts', /export const CORE_VERSION: string = '([^']*)'/, 'CORE_VERSION'],
];

let failed = false;
for (const [rel, re, name] of checks) {
  const src = await readFile(fileURLToPath(new URL(rel, root)), 'utf8');
  const found = src.match(re)?.[1];
  if (found !== version) {
    console.error(
      `check-version: FAIL — ${name} in ${rel} is '${found}', expected '${version}' (package.json). Run: node scripts/sync-version.mjs`,
    );
    failed = true;
  }
}
if (failed) {
  process.exit(1);
}
console.log(`check-version: OK — VERSION / CORE_VERSION match package.json (${version})`);
