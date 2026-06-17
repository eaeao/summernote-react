import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SummernoteEditor } from '../src/SummernoteEditor';

afterEach(() => {
  cleanup();
});

describe('Themes (per-instance, multi-engine)', () => {
  it('defaults to the lite theme class', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    expect(container.querySelector('.note-editor.note-theme-lite')).not.toBeNull();
  });

  it('applies the requested theme class', () => {
    for (const theme of ['bs3', 'bs4', 'bs5'] as const) {
      const { container, unmount } = render(<SummernoteEditor defaultValue="<p>x</p>" theme={theme} />);
      expect(container.querySelector(`.note-editor.note-theme-${theme}`)).not.toBeNull();
      unmount();
    }
  });

  it('two editors with different themes coexist (per-instance, no global theme)', () => {
    const { container } = render(
      <div>
        <SummernoteEditor defaultValue="<p>a</p>" theme="lite" />
        <SummernoteEditor defaultValue="<p>b</p>" theme="bs5" />
      </div>,
    );
    expect(container.querySelector('.note-theme-lite')).not.toBeNull();
    expect(container.querySelector('.note-theme-bs5')).not.toBeNull();
    // both editors are independently mounted with their own content
    const editables = container.querySelectorAll('.note-editable');
    expect(editables.length).toBe(2);
    expect(editables[0]?.innerHTML).toBe('<p>a</p>');
    expect(editables[1]?.innerHTML).toBe('<p>b</p>');
  });

  it('keeps the full .note-* class contract across themes', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p>x</p>" theme="bs5" />);
    expect(container.querySelector('.note-toolbar')).not.toBeNull();
    expect(container.querySelector('.note-btn.note-btn-bold')).not.toBeNull();
    expect(container.querySelector('.note-editing-area')).not.toBeNull();
    expect(container.querySelector('.note-statusbar')).not.toBeNull();
  });
});
