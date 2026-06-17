import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { locales, localeCodes } from '@summernote/core';
import { SummernoteEditor } from '../src/SummernoteEditor';

afterEach(() => {
  cleanup();
});

describe('i18n (locale registry, multi-engine)', () => {
  it('ships 40+ locales including the major ones', () => {
    expect(localeCodes.length).toBeGreaterThanOrEqual(40);
    for (const code of ['ko-KR', 'ja-JP', 'zh-CN', 'fr-FR', 'de-DE', 'es-ES', 'ru-RU']) {
      expect(locales[code]).toBeTruthy();
    }
  });

  it('applies a locale to the toolbar tooltips', () => {
    const ko = locales['ko-KR'];
    const boldLabel = ko?.font?.bold;
    expect(boldLabel).toBeTruthy();
    const { getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" lang={ko} />);
    // the Bold button's accessible name is the localized string
    expect(getByRole('button', { name: boldLabel as string })).not.toBeNull();
  });

  it('a custom partial overrides only what it specifies; the rest falls back to en-US', () => {
    const { getByRole } = render(
      <SummernoteEditor defaultValue="<p>x</p>" lang={{ font: { bold: 'GRASSO' } }} />,
    );
    expect(getByRole('button', { name: 'GRASSO' })).not.toBeNull(); // overridden
    expect(getByRole('button', { name: 'Underline' })).not.toBeNull(); // en-US fallback
    expect(getByRole('button', { name: 'Link' })).not.toBeNull(); // group absent in partial -> en-US
  });

  it('defaults to en-US with no lang prop', () => {
    const { getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    expect(getByRole('button', { name: 'Bold' })).not.toBeNull();
  });
});
