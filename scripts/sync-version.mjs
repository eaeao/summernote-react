/**
 * Sync the exported VERSION / CORE_VERSION literals to package.json's version.
 * Run by `yarn version-packages` after changesets bumps package.json. The matching
 * check-version.mjs gate fails the build if these ever drift.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

const targets = [
  ['src/index.ts', /(export const VERSION: string = ')[^']*(';)/],
  ['src/engine/index.ts', /(export const CORE_VERSION: string = ')[^']*(';)/],
];

for (const [rel, re] of targets) {
  const path = fileURLToPath(new URL(rel, root));
  const src = await readFile(path, 'utf8');
  const next = src.replace(re, `$1${version}$2`);
  if (next !== src) {
    await writeFile(path, next);
    console.log(`sync-version: ${rel} -> ${version}`);
  }
}
