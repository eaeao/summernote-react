import { describe, it, expect, afterEach } from 'vitest';
import { createEditorCore } from '../src/EditorCore';
import { mount, resetDom } from '../../../test/util';

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
