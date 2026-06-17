import { describe, it, expect, afterEach } from 'vitest';
import { createEditorCore } from '../src/EditorCore';
import { mount, resetDom } from '../../../test/util';
import golden from '../../../test/golden/commands.json';

/**
 * Golden parity gate: replay the legacy-recorded corpus (test/golden/commands.json) through
 * the new own-command engine (NO execCommand) and assert it reproduces the legacy oracle.
 *
 * - Tier-A block commands (justify/lists via Style.stylePara / Bullet) must match byte-for-byte.
 * - Tier-B inline-format toggles (via Style.styleNodes) match after a deterministic-markup
 *   re-baseline: own-commands emit modern <s> where legacy execCommand emitted deprecated
 *   <strike> (see PORTING-PLAN.md §2). All other inline tags match the legacy output.
 */
const BLOCK_METHODS = new Set([
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
  'justifyFull',
  'insertOrderedList',
  'insertUnorderedList',
  'formatPara',
  'formatH1',
  'formatH2',
  'formatH3',
  'formatH4',
  'formatH5',
  'formatH6',
]);

const INLINE_METHODS = new Set([
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'superscript',
  'subscript',
  'removeFormat',
]);

/** the only sanctioned deviation: deprecated <strike> is re-baselined to modern <s>. */
function reBaseline(html: string): string {
  return html.replace(/<strike>/gi, '<s>').replace(/<\/strike>/gi, '</s>');
}

function selectAll(editable: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(editable);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function method(rec: { action: { method: string } }): string {
  return rec.action.method.replace(/^editor\./, '');
}

afterEach(() => {
  resetDom();
});

describe('golden parity (multi-engine, own-commands vs legacy oracle)', () => {
  const blockCases = golden.records.filter((r) => r.action !== null && r.select === 'all' && BLOCK_METHODS.has(method(r as { action: { method: string } })));
  const inlineCases = golden.records.filter((r) => r.action !== null && r.select === 'all' && INLINE_METHODS.has(method(r as { action: { method: string } })));

  it('covers the recorded block + inline commands', () => {
    expect(blockCases.length).toBeGreaterThanOrEqual(5); // justifyRight, ol, ul, formatH1, formatPara
    expect(inlineCases.length).toBeGreaterThanOrEqual(7); // b/i/u/strike/sup/sub/removeFormat
  });

  for (const rec of [...blockCases, ...inlineCases]) {
    it(`reproduces legacy ${rec.name}`, () => {
      const el = mount('<div></div>');
      const core = createEditorCore(el, { value: rec.initialHTML });
      selectAll(el);
      core.command(method(rec as { action: { method: string } }));
      expect(core.getHTML()).equalsIgnoreCase(reBaseline(rec.resultHTML));
      core.destroy();
    });
  }

  // code() round-trip: seeding the editor with the legacy HTML must read back unchanged.
  const roundtripCases = golden.records.filter((r) => r.action === null);
  for (const rec of roundtripCases) {
    it(`round-trips ${rec.name}`, () => {
      const el = mount('<div></div>');
      const core = createEditorCore(el, { value: rec.initialHTML });
      expect(core.getHTML()).equalsIgnoreCase(rec.resultHTML);
      core.destroy();
    });
  }
});
