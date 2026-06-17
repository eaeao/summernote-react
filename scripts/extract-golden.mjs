/**
 * Golden-corpus recorder (Phase 0).
 *
 * Bundles the LEGACY jQuery summernote (0.9.1, lite theme) on the fly with esbuild
 * (styles/fonts emptied — we capture editing BEHAVIOR, not pixels), drives it in a real
 * browser via Playwright, and freezes per-case outputs into test/golden/*.json. This is
 * the immutable parity oracle the React/TS port is validated against; because the recorder
 * sources the LEGACY engine (never the port), it cannot launder a port regression.
 *
 * Run manually:  node scripts/extract-golden.mjs
 */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const WRAPPER = `
import $ from 'jquery';
import '@/js/summernote';                  // defines $.fn.summernote
import '@/styles/lite/summernote-lite';     // registers the lite ui_template
window.$ = window.jQuery = $;
`;

const INLINE = ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'removeFormat'];

/** initialHTML x (selection) x action -> recorded resultHTML. Focused first slice:
 *  load-normalization round-trips + the highest-risk inline-format commands + key blocks. */
const MATRIX = [
  { name: 'roundtrip:paragraph', initialHTML: '<p>hello</p>' },
  { name: 'roundtrip:nested-span', initialHTML: '<p>a<span style="font-size: 24px;">b</span>c</p>' },
  { name: 'roundtrip:bold-tag', initialHTML: '<p>a<b>b</b>c</p>' },
  { name: 'roundtrip:list', initialHTML: '<ul><li>a</li><li>b</li></ul>' },
  { name: 'roundtrip:table', initialHTML: '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>' },
  { name: 'roundtrip:blockquote', initialHTML: '<blockquote>q</blockquote>' },
  ...INLINE.map((m) => ({
    name: `inline:${m}`,
    initialHTML: '<p>hello</p>',
    select: 'all',
    action: { method: `editor.${m}` },
  })),
  { name: 'block:formatH1', initialHTML: '<p>hello</p>', select: 'all', action: { method: 'editor.formatH1' } },
  { name: 'block:formatPara', initialHTML: '<h1>hello</h1>', select: 'all', action: { method: 'editor.formatPara' } },
  { name: 'block:orderedList', initialHTML: '<p>hello</p>', select: 'all', action: { method: 'editor.insertOrderedList' } },
  { name: 'block:unorderedList', initialHTML: '<p>hello</p>', select: 'all', action: { method: 'editor.insertUnorderedList' } },
  { name: 'block:justifyRight', initialHTML: '<p>hello</p>', select: 'all', action: { method: 'editor.justifyRight' } },
  { name: 'insert:horizontalRule', initialHTML: '<p>hello</p>', select: 'all', action: { method: 'editor.insertHorizontalRule' } },
];

async function bundleLegacy() {
  const result = await build({
    stdin: { contents: WRAPPER, resolveDir: process.cwd(), loader: 'js' },
    bundle: true,
    format: 'iife',
    write: false,
    alias: { '@': path.resolve('src') },
    loader: {
      '.scss': 'empty',
      '.css': 'empty',
      '.woff': 'empty',
      '.woff2': 'empty',
      '.ttf': 'empty',
      '.eot': 'empty',
      '.svg': 'empty',
      '.png': 'empty',
    },
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

async function main() {
  const bundleJs = await bundleLegacy();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  await page.addScriptTag({ content: bundleJs });

  const records = await page.evaluate((matrix) => {
    const $ = window.$;
    function selectContents(el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const out = [];
    for (const item of matrix) {
      const $div = $('<div></div>').appendTo(document.body);
      $div.summernote(item.options || {});
      $div.summernote('code', item.initialHTML);
      const editable = document.querySelector('.note-editable');
      editable.focus();
      if (item.select === 'all') selectContents(editable);
      if (item.action) {
        $div.summernote(item.action.method, ...(item.action.args || []));
      }
      const resultHTML = $div.summernote('code');
      out.push({
        name: item.name,
        initialHTML: item.initialHTML,
        select: item.select || null,
        action: item.action || null,
        options: item.options || null,
        resultHTML,
      });
      $div.summernote('destroy');
      $div.remove();
    }
    return out;
  }, MATRIX);

  await browser.close();

  if (pageErrors.length > 0) {
    console.error('PAGE ERRORS:\n' + pageErrors.join('\n'));
    process.exit(1);
  }

  mkdirSync('test/golden', { recursive: true });
  const payload = {
    recordedBy: 'scripts/extract-golden.mjs',
    source: 'legacy summernote 0.9.1 (lite theme), execCommand-based engine',
    engine: 'chromium',
    note: 'IMMUTABLE parity oracle. Do NOT regenerate from the port. Inline-format markup is execCommand output (non-deterministic across engines) — the port re-baselines it to deterministic own-command markup; see docs/PORTING-PLAN.md §2.',
    records,
  };
  writeFileSync(path.join('test', 'golden', 'commands.json'), JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${records.length} golden records to test/golden/commands.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
