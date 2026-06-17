/**
 * CI gate: the @eaeao4jerry/summernote-* packages must contain ZERO jQuery usage.
 * Backstop for the port's "jQuery removed entirely" invariant — runs from commit one.
 * Comment text is stripped before matching so doc comments may mention jQuery freely.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['packages'];
const FILE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_DIR = /(^|[\\/])(dist|node_modules)([\\/]|$)/;

const PATTERNS = [
  { re: /from\s+['"]jquery['"]/, msg: "import from 'jquery'" },
  { re: /require\(\s*['"]jquery['"]\s*\)/, msg: "require('jquery')" },
  { re: /import\(\s*['"]jquery['"]\s*\)/, msg: "import('jquery')" },
  { re: /\bjQuery\b/, msg: 'jQuery global' },
  { re: /\$\(/, msg: '$( call' },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIR.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (FILE_EXT.test(name)) yield p;
  }
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments (keep http://)
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const code = stripComments(readFileSync(file, 'utf8'));
    for (const { re, msg } of PATTERNS) {
      if (re.test(code)) violations.push(`  ${file}  —  ${msg}`);
    }
  }
}

if (violations.length > 0) {
  console.error('check-no-jquery: FAIL — jQuery is banned in @eaeao4jerry/summernote-* packages:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('check-no-jquery: OK — zero jQuery usage under packages/');
