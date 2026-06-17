import { describe, it, expect, afterEach } from 'vitest';
import { createEditorCore } from '../src/EditorCore';
import { mount, resetDom } from '../../../test/util';

afterEach(() => {
  resetDom();
});

function selectContents(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function keydown(target: HTMLElement, init: KeyboardEventInit & { keyCode: number }): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  // jsdom/browsers don't infer keyCode from init in all engines — force it
  Object.defineProperty(e, 'keyCode', { get: () => init.keyCode });
  target.dispatchEvent(e);
  return e;
}

describe('keyboard shortcuts (keyMap -> command, multi-engine)', () => {
  it('Ctrl+B applies bold over the selection', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>', isMac: false });
    selectContents(el.querySelector('p') as HTMLElement);
    const e = keydown(el, { ctrlKey: true, keyCode: 66 }); // B
    expect(e.defaultPrevented).toBe(true);
    expect(el.querySelector('p')!.innerHTML).toBe('<b>hello</b>');
    core.destroy();
  });

  it('Ctrl+Z / Ctrl+Y undo and redo', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>', isMac: false });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('bold');
    expect(el.querySelector('b')).not.toBeNull();

    keydown(el, { ctrlKey: true, keyCode: 90 }); // Z -> undo
    expect(el.querySelector('b')).toBeNull();
    keydown(el, { ctrlKey: true, keyCode: 89 }); // Y -> redo
    expect(el.querySelector('b')).not.toBeNull();
    core.destroy();
  });

  it('Ctrl+1 formats H1 (NUM1)', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>x</p>', isMac: false });
    selectContents(el.querySelector('p') as HTMLElement);
    keydown(el, { ctrlKey: true, keyCode: 49 }); // '1'
    expect(el.querySelector('h1')).not.toBeNull();
    core.destroy();
  });

  it('onShortcut fires for a non-command method (linkDialog.show)', () => {
    const el = mount('<div></div>');
    let called = '';
    const core = createEditorCore(el, {
      value: '<p>x</p>',
      isMac: false,
      onShortcut: (m) => {
        called = m;
        return true;
      },
    });
    const e = keydown(el, { ctrlKey: true, keyCode: 75 }); // K -> linkDialog.show
    expect(called).toBe('linkDialog.show');
    expect(e.defaultPrevented).toBe(true);
    core.destroy();
  });

  it('plain keys and shortcuts:false are ignored', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>', isMac: false, shortcuts: false });
    selectContents(el.querySelector('p') as HTMLElement);
    const e = keydown(el, { ctrlKey: true, keyCode: 66 });
    expect(e.defaultPrevented).toBe(false);
    expect(el.querySelector('b')).toBeNull();
    core.destroy();
  });
});
