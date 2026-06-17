import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SummernoteEditor } from '../src/SummernoteEditor';

afterEach(() => {
  cleanup();
});

function selectContents(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('Dialogs (link/image/video/help, multi-engine)', () => {
  it('Link dialog inserts a link over the selection (prefilled text)', () => {
    const { container, getByRole, getByLabelText } = render(<SummernoteEditor defaultValue="<p>hello</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Link' }));
    // text prefilled from selection
    const textInput = container.querySelector('.note-link-text') as HTMLInputElement;
    expect(textInput.value).toBe('hello');
    const urlInput = container.querySelector('.note-link-url') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://summernote.org' } });
    fireEvent.click(getByRole('button', { name: 'Insert Link' }));

    const a = editable.querySelector('a') as HTMLAnchorElement;
    expect(a).not.toBeNull();
    expect(a.getAttribute('href')).toBe('https://summernote.org');
    expect(a.getAttribute('target')).toBe('_blank');
    void getByLabelText;
  });

  it('Image dialog inserts an image from a URL', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Picture' }));
    const urlInput = container.querySelector('.note-image-url') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://example.com/a.png' } });
    fireEvent.click(getByRole('button', { name: 'Insert Image' }));

    const img = editable.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('Video dialog inserts a YouTube embed', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Video' }));
    const urlInput = container.querySelector('.note-video-url') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(getByRole('button', { name: 'Insert Video' }));

    expect(editable.querySelector('iframe.note-video-clip')).not.toBeNull();
  });

  it('Help dialog lists keyboard shortcuts', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    fireEvent.click(getByRole('button', { name: 'Help' }));
    const rows = container.querySelectorAll('.note-shortcut-row');
    expect(rows.length).toBeGreaterThan(10);
    // a known mapping is present
    expect(container.textContent).toContain('Undo the last command');
  });

  it('dialog closes on backdrop click', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    fireEvent.click(getByRole('button', { name: 'Video' }));
    expect(container.querySelector('.note-modal')).not.toBeNull();
    fireEvent.click(container.querySelector('.note-modal-backdrop') as HTMLElement);
    expect(container.querySelector('.note-modal')).toBeNull();
  });

  it('Link dialog edits an existing anchor in place (no nesting)', () => {
    const { container, getByRole } = render(
      <SummernoteEditor defaultValue='<p><a href="https://old.com">site</a></p>' />,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('a') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Link' }));
    const urlInput = container.querySelector('.note-link-url') as HTMLInputElement;
    expect(urlInput.value).toBe('https://old.com'); // prefilled from anchor
    fireEvent.change(urlInput, { target: { value: 'https://new.com' } });
    fireEvent.click(getByRole('button', { name: 'Insert Link' }));

    expect(editable.querySelectorAll('a').length).toBe(1);
    expect((editable.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe('https://new.com');
  });
});
