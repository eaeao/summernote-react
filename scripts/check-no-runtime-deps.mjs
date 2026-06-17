/**
 * CI gate: shipped @eaeao4jerry/summernote-* editor packages must declare ZERO third-party runtime
 * dependencies (the port's "no external editor/runtime deps" invariant). Internal
 * workspace deps (@eaeao4jerry/summernote-*) are allowed; react/react-dom live in peerDependencies.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PKGS_DIR = 'packages';
const errors = [];

for (const name of readdirSync(PKGS_DIR)) {
  const manifest = join(PKGS_DIR, name, 'package.json');
  if (!existsSync(manifest)) continue;
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  const deps = pkg.dependencies ?? {};
  for (const dep of Object.keys(deps)) {
    if (dep.startsWith('@eaeao4jerry/summernote-')) continue; // internal workspace dependency
    errors.push(`  ${pkg.name}: third-party runtime dependency "${dep}"`);
  }
}

if (errors.length > 0) {
  console.error(
    'check-no-runtime-deps: FAIL — editor packages must have zero third-party runtime deps:\n' +
      errors.join('\n'),
  );
  process.exit(1);
}
console.log('check-no-runtime-deps: OK — no third-party runtime deps under packages/');
