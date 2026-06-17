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

describe('Toolbar (config-driven from options.toolbar, multi-engine)', () => {
  it('renders the default summernote toolbar groups + class contract', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    // command buttons present by accessible name
    for (const name of ['Bold', 'Underline', 'Remove Font Style', 'Unordered list', 'Ordered list', 'Link', 'Picture']) {
      expect(getByRole('button', { name })).not.toBeNull();
    }
    // dropdown toggles present
    for (const name of ['Style', 'Font Family', 'Paragraph', 'Table']) {
      expect(getByRole('button', { name })).not.toBeNull();
    }
    // class contract
    expect(container.querySelector('.note-toolbar')).not.toBeNull();
    expect(container.querySelector('.note-btn-group.note-font')).not.toBeNull();
    expect(container.querySelector('.note-btn.note-btn-bold .note-icon-bold')).not.toBeNull();
    expect(container.querySelector('.note-dropdown')).not.toBeNull();
  });

  it('Bold button toggles markup + pressed state', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);
    const bold = getByRole('button', { name: 'Bold' });
    fireEvent.click(bold);
    expect(editable.innerHTML).toBe('<p><b>hi</b></p>');
    expect(bold.getAttribute('aria-pressed')).toBe('true');
  });

  it('Style dropdown formats the block (Quote -> blockquote)', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>quote</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Style' })); // open dropdown
    fireEvent.click(getByRole('button', { name: 'Quote' })); // blockquote item

    expect(editable.querySelector('blockquote')).not.toBeNull();
    expect(editable.querySelector('p')).toBeNull();
  });

  it('Font Family dropdown applies a font', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Font Family' }));
    fireEvent.click(getByRole('button', { name: /Courier New/ }));

    const span = editable.querySelector('span') as HTMLElement;
    expect(span.style.fontFamily.replace(/["']/g, '')).toBe('Courier New');
  });

  it('Color dropdown applies a foreground color', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: /Text Color/ }));
    const redFore = container.querySelector('[data-kind="fore"] [data-value="#FF0000"]') as HTMLElement;
    expect(redFore).not.toBeNull();
    fireEvent.click(redFore);

    expect((editable.querySelector('span') as HTMLElement).style.color).toBe('rgb(255, 0, 0)');
  });

  it('Paragraph dropdown aligns center', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByRole('button', { name: 'Paragraph' }));
    fireEvent.click(getByRole('button', { name: 'Align center' }));

    expect((editable.querySelector('p') as HTMLElement).style.textAlign).toBe('center');
  });

  it('Table dropdown inserts a table via the picker', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p><br></p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    const p = editable.querySelector('p') as HTMLElement;
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);

    fireEvent.click(getByRole('button', { name: 'Table' }));
    const cell = container.querySelector('[data-value="2x2"]') as HTMLElement;
    fireEvent.click(cell);

    expect(editable.querySelector('table')).not.toBeNull();
    expect(editable.querySelectorAll('tr').length).toBe(2);
    expect(editable.querySelectorAll('td').length).toBe(4);
  });

  it('dropdown closes on outside click', () => {
    const { container, getByRole } = render(<SummernoteEditor defaultValue="<p>hi</p>" />);
    const dropdown = getByRole('button', { name: 'Style' }).closest('.note-dropdown') as HTMLElement;
    fireEvent.click(getByRole('button', { name: 'Style' }));
    expect(dropdown.classList.contains('open')).toBe(true);
    fireEvent.mouseDown(document.body);
    expect(dropdown.classList.contains('open')).toBe(false);
  });

  it('honors a custom toolbar config', () => {
    const { getByRole, queryByRole } = render(
      <SummernoteEditor defaultValue="<p>hi</p>" toolbar={[['font', ['bold', 'underline']]]} />,
    );
    expect(getByRole('button', { name: 'Bold' })).not.toBeNull();
    expect(getByRole('button', { name: 'Underline' })).not.toBeNull();
    expect(queryByRole('button', { name: 'Table' })).toBeNull();
    expect(queryByRole('button', { name: 'Link' })).toBeNull();
  });
});
