import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { SummernoteEditor } from '../src/SummernoteEditor';

afterEach(() => {
  cleanup();
});

function caretIn(node: Node, offset = 0): void {
  // wrap in act() so the useSyncExternalStore re-render (driven by the selectionchange the engine
  // listens to) flushes before assertions — in a real browser this happens on React's schedule.
  act(() => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

describe('Popovers (link/table/image, multi-engine)', () => {
  it('shows the link popover when the caret is on an anchor, and unlinks', () => {
    const { container } = render(<SummernoteEditor defaultValue='<p><a href="https://x.com">site</a></p>' />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    caretIn(editable.querySelector('a')!.firstChild as Node, 1);

    const pop = container.querySelector('.note-link-popover') as HTMLElement;
    expect(pop).not.toBeNull();
    expect(pop.querySelector('.note-popover-link')?.textContent).toBe('https://x.com');

    fireEvent.click(pop.querySelector('[aria-label="Unlink"]') as HTMLElement);
    expect(editable.querySelector('a')).toBeNull();
  });

  it('shows the table popover in a cell, and adds a row', () => {
    const { container } = render(
      <SummernoteEditor defaultValue='<table class="table"><tbody><tr><td>a</td></tr></tbody></table>' />,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    caretIn(editable.querySelector('td')!.firstChild as Node, 0);

    const pop = container.querySelector('.note-table-popover') as HTMLElement;
    expect(pop).not.toBeNull();
    fireEvent.click(pop.querySelector('[aria-label="Add row below"]') as HTMLElement);
    expect(editable.querySelectorAll('tr').length).toBe(2);
  });

  it('shows the image popover on image click, resizes + removes', () => {
    const { container } = render(<SummernoteEditor defaultValue='<p><img src="data:," alt="x"></p>' />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    const img = editable.querySelector('img') as HTMLImageElement;
    fireEvent.click(img);

    const pop = container.querySelector('.note-image-popover') as HTMLElement;
    expect(pop).not.toBeNull();

    fireEvent.click(pop.querySelector('[aria-label="Resize half"]') as HTMLElement);
    expect(img.style.width).toBe('50%');

    fireEvent.click(pop.querySelector('[aria-label="Float Left"]') as HTMLElement);
    expect(img.style.cssFloat || img.style.float).toBe('left');

    fireEvent.click(container.querySelector('.note-image-popover [aria-label="Remove Image"]') as HTMLElement);
    expect(editable.querySelector('img')).toBeNull();
    expect(container.querySelector('.note-image-popover')).toBeNull();
  });

  it('no popover for a plain paragraph caret', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p>plain</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    caretIn(editable.querySelector('p')!.firstChild as Node, 2);
    expect(container.querySelector('.note-popover')).toBeNull();
  });
});
