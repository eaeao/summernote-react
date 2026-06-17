import { describe, it, expect } from 'vitest';
import { CORE_VERSION } from '@summernote/core';

describe('@summernote/core smoke (multi-engine)', () => {
  it('resolves the workspace package via the src alias', () => {
    expect(CORE_VERSION).toBe('0.0.0');
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
