import { describe, it, expect, afterEach } from 'vitest';
import { createEditorCore } from '../src/engine/EditorCore';
import { mount, resetDom } from './util';

afterEach(() => {
  resetDom();
});

function select(node: Node, so: number, eo: number): void {
  const r = document.createRange();
  r.setStart(node, so);
  r.setEnd(node, eo);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
  document.dispatchEvent(new Event('selectionchange')); // let the editor cache lastGoodRange
}

function caretAt(node: Node, offset: number): void {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
  document.dispatchEvent(new Event('selectionchange'));
}

// Dictionary / translator browser extensions (NDIC, Google Translate's selection popup, …) arm on
// text selection and steal it when a toolbar button is pressed — they ignore data-gramm /
// translate="no". They usually COLLAPSE the selection to a caret (the editable keeps focus), not
// clear it. The editor caches the last real in-editor selection and restores it before a command,
// but drops it when the user places a caret by clicking IN the editor (so bold-then-type still works).
describe('selection robustness vs. selection-grabbing extensions', () => {
  it('recovers when the selection is cleared before a command', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>Edit me</p>' });
    select(el.querySelector('p')!.firstChild as Node, 0, 7);

    window.getSelection()?.removeAllRanges(); // extension wipes it

    core.command('bold');
    expect((el.querySelector('b') as HTMLElement | null)?.textContent).toBe('Edit me');
    core.destroy();
  });

  it('recovers when an extension COLLAPSES the selection to a caret (not the user)', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>Edit me now</p>' });
    const t = el.querySelector('p')!.firstChild as Node;
    select(t, 0, 7); // "Edit me"

    // extension collapses to a caret WITHOUT a press inside the editor
    caretAt(t, 0);

    core.command('bold');
    expect((el.querySelector('b') as HTMLElement | null)?.textContent).toBe('Edit me');
    core.destroy();
  });

  it('recovers when the selection is moved OUT of the editor before a command', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    select(el.querySelector('p')!.firstChild as Node, 0, 5);

    const outside = document.createElement('span');
    outside.textContent = 'popup';
    document.body.appendChild(outside);
    const r = document.createRange();
    r.selectNodeContents(outside);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);

    core.command('color', { foreColor: '#ff0000' });
    const span = el.querySelector('span[style]') as HTMLElement | null;
    expect(span?.style.color).toBe('rgb(255, 0, 0)');
    expect(span?.textContent).toBe('hello');
    outside.remove();
    core.destroy();
  });

  it('does NOT restore a stale selection after the user places a caret in the editor', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello world</p>' });
    const t = el.querySelector('p')!.firstChild as Node;
    select(t, 0, 5); // "hello"

    // the user clicks IN the editor to place a caret elsewhere — this must drop the saved selection
    el.querySelector('p')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    caretAt(t, 11); // caret after "world"

    core.command('bold');
    // "hello" must NOT be restored-and-bolded; bold acts on the caret instead
    expect((el.querySelector('b') as HTMLElement | null)?.textContent).not.toBe('hello');
    core.destroy();
  });

  it('no-ops a command when there was never an in-editor selection', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hi</p>' });
    window.getSelection()?.removeAllRanges();
    expect(core.command('bold')).toBe(false);
    core.destroy();
  });
});
