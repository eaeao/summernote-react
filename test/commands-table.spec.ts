import { describe, it, expect, afterEach } from 'vitest';
import { createEditorCore } from '../src/engine/EditorCore';
import { mount, resetDom } from './util';

afterEach(() => {
  resetDom();
});

function caretAt(node: Node, offset: number): void {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('table commands (own Table engine, multi-engine)', () => {
  it('insertTable inserts a 2x2 table', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p><br></p>' });
    caretAt(el.querySelector('p') as HTMLElement, 0);

    core.command('insertTable', '2x2');

    expect(el.querySelector('table')).not.toBeNull();
    expect(el.querySelectorAll('tr').length).toBe(2);
    expect(el.querySelectorAll('td').length).toBe(4);
    core.destroy();
  });

  it('addRow adds a row to the table at the cursor', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, {
      value: '<table class="table"><tbody><tr><td>a</td></tr></tbody></table>',
    });
    const cell = el.querySelector('td') as HTMLElement;
    caretAt(cell.firstChild as Node, 0);

    core.command('addRow', 'bottom');

    expect(el.querySelectorAll('tr').length).toBe(2);
    core.destroy();
  });

  it('addCol adds a column to the table at the cursor', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, {
      value: '<table class="table"><tbody><tr><td>a</td></tr></tbody></table>',
    });
    caretAt((el.querySelector('td') as HTMLElement).firstChild as Node, 0);

    core.command('addCol', 'right');

    expect(el.querySelectorAll('td').length).toBe(2);
    core.destroy();
  });

  function currentCellText(): string | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let n: Node | null = sel.getRangeAt(0).startContainer;
    while (n && n.nodeName !== 'TD' && n.nodeName !== 'TH') n = n.parentNode;
    return n ? n.textContent : null;
  }

  it('tab moves the caret to the next cell', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, {
      value: '<table class="table"><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>',
    });
    caretAt((el.querySelectorAll('td')[0] as HTMLElement).firstChild as Node, 0);

    core.command('tab');

    expect(currentCellText()).toBe('b');
    core.destroy();
  });

  it('shift-tab (untab) moves the caret to the previous cell', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, {
      value: '<table class="table"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>',
    });
    caretAt((el.querySelectorAll('td')[1] as HTMLElement).firstChild as Node, 0);

    core.command('untab');

    expect(currentCellText()).toBe('a');
    core.destroy();
  });

  it('tab outside a table inserts an indent run instead of escaping the editor', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>x</p>' });
    caretAt((el.querySelector('p') as HTMLElement).firstChild as Node, 1);

    core.command('tab');

    const text = (el.querySelector('p') as HTMLElement).textContent ?? '';
    expect(text).toBe('x' + String.fromCharCode(160).repeat(4));
    core.destroy();
  });

  it('deleteTable removes the table', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, {
      value: '<table class="table"><tbody><tr><td>a</td></tr></tbody></table>',
    });
    caretAt((el.querySelector('td') as HTMLElement).firstChild as Node, 0);

    core.command('deleteTable');

    expect(el.querySelector('table')).toBeNull();
    core.destroy();
  });
});
