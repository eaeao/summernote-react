import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SummernoteEditor } from '../src/SummernoteEditor';

afterEach(() => {
  cleanup();
});

describe('View controls (fullscreen / codeview / statusbar / placeholder, multi-engine)', () => {
  it('Fullscreen toggles the .fullscreen class on the editor root', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    const editor = container.querySelector('.note-editor') as HTMLElement;
    expect(editor.classList.contains('fullscreen')).toBe(false);
    fireEvent.click(getByRole('button', { name: 'Full Screen' }));
    expect(editor.classList.contains('fullscreen')).toBe(true);
    fireEvent.click(getByRole('button', { name: 'Full Screen' }));
    expect(editor.classList.contains('fullscreen')).toBe(false);
  });

  it('Codeview shows the textarea with the HTML and syncs edits back', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;

    fireEvent.click(getByRole('button', { name: 'Code View' }));
    const textarea = container.querySelector('.note-codable') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('<p>hi</p>');

    fireEvent.change(textarea, { target: { value: '<p>edited</p>' } });
    fireEvent.click(getByRole('button', { name: 'Code View' })); // toggle off -> sync

    expect(container.querySelector('.note-codable')).toBeNull();
    expect(editable.innerHTML).toBe('<p>edited</p>');
  });

  it('Codeview disables the formatting toolbar (Bold)', () => {
    const { getByRole } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    expect(getByRole('button', { name: 'Bold' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(getByRole('button', { name: 'Code View' }));
    expect(getByRole('button', { name: 'Bold' }).hasAttribute('disabled')).toBe(true);
    // codeview button itself stays active/enabled
    const cv = getByRole('button', { name: 'Code View' });
    expect(cv.hasAttribute('disabled')).toBe(false);
    expect(cv.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders a resize statusbar by default, omits it when disabled', () => {
    const { container, rerender } = render(<SummernoteEditor defaultValue="<p>x</p>" />);
    expect(container.querySelector('.note-statusbar .note-resizebar')).not.toBeNull();
    rerender(<SummernoteEditor defaultValue="<p>x</p>" disableResize />);
    expect(container.querySelector('.note-statusbar')).toBeNull();
  });

  it('shows the placeholder over an empty editable', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p><br></p>" placeholder="Type here" />);
    expect(container.querySelector('.note-placeholder')?.textContent).toBe('Type here');
  });

  it('does not show the placeholder when the editable has content', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p>filled</p>" placeholder="Type here" />);
    expect(container.querySelector('.note-placeholder')).toBeNull();
  });

  it('hides the placeholder after content is typed', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p><br></p>" placeholder="Type here" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    expect(container.querySelector('.note-placeholder')).not.toBeNull();
    editable.innerHTML = '<p>typed</p>';
    fireEvent.input(editable);
    expect(container.querySelector('.note-placeholder')).toBeNull();
  });
});
