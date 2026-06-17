import { describe, it, expect } from 'vitest';
import golden from './golden/commands.json';

/**
 * Freeze-guard for the golden parity oracle (test/golden/commands.json).
 *
 * The corpus is recorded from the LEGACY jQuery/execCommand engine by
 * scripts/extract-golden.mjs and is IMMUTABLE. This guard is a tripwire: if the corpus
 * were ever regenerated from the new port (whose own-command engine emits deterministic
 * markup instead of execCommand's <b>/<i>/<strike>), the legacy-markup assertions below
 * would fail — so a regression can never be silently laundered into the oracle.
 */
describe('golden corpus (freeze-guard)', () => {
  it('is present and well-formed', () => {
    expect(Array.isArray(golden.records)).toBe(true);
    expect(golden.records.length).toBeGreaterThanOrEqual(19);
    for (const r of golden.records) {
      expect(typeof r.name).toBe('string');
      expect(typeof r.initialHTML).toBe('string');
      expect(typeof r.resultHTML).toBe('string');
    }
  });

  it('declares its provenance as the legacy execCommand engine', () => {
    expect(golden.source).toMatch(/legacy summernote/i);
    expect(golden.note).toMatch(/IMMUTABLE/);
  });

  it('carries legacy execCommand markup, not port own-command markup (anti-launder tripwire)', () => {
    const byName = Object.fromEntries(golden.records.map((r) => [r.name, r.resultHTML]));
    // Legacy execCommand emits these exact tags; the port re-baselines to deterministic
    // own-command markup (e.g. <strong>/<em>/<s>). Divergence here means the oracle was
    // regenerated from the wrong source.
    expect(byName['inline:bold']).toBe('<p><b>hello</b></p>');
    expect(byName['inline:italic']).toBe('<p><i>hello</i></p>');
    expect(byName['inline:strikethrough']).toBe('<p><strike>hello</strike></p>');
  });

  it('preserves HTML on load round-trips', () => {
    const byName = Object.fromEntries(golden.records.map((r) => [r.name, r]));
    for (const name of ['roundtrip:paragraph', 'roundtrip:list', 'roundtrip:table', 'roundtrip:blockquote']) {
      expect(byName[name].resultHTML).toBe(byName[name].initialHTML);
    }
  });
});
