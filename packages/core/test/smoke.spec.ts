import { describe, it, expect } from 'vitest';
import { CORE_VERSION } from '@eaeao4jerry/summernote-core';

describe('@eaeao4jerry/summernote-core smoke (multi-engine)', () => {
  it('resolves the workspace package via the src alias', () => {
    expect(CORE_VERSION).toMatch(/^\d+\.\d+\.\d+/); // resolves + exposes a semver
  });

  it('runs in a real browser DOM with contentEditable support', () => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    document.body.appendChild(el);
    expect(el.isContentEditable).toBe(true);
    el.remove();
  });

  it('exposes a usable Selection/Range API (editor engine foundation)', () => {
    expect(typeof window.getSelection).toBe('function');
    const range = document.createRange();
    expect(range).toBeInstanceOf(Range);
  });
});
