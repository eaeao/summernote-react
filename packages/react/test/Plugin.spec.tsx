import { describe, it, expect, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { SummernoteEditor, type SummernoteEditorHandle } from '../src/SummernoteEditor';
import { helloPlugin } from '../src/plugins/hello';
import { definePlugin } from '../src/plugin';
import { useChrome, useCommand } from '../src/chrome/ChromeContext';

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

describe('Plugin API + imperative handle (multi-engine)', () => {
  it('renders a plugin custom button and runs its registered command', () => {
    const { container, getByRole } = render(
      <SummernoteEditor defaultValue="<p>x</p>" plugins={[helloPlugin]} toolbar={[['insert', ['hello']]]} />,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    const p = editable.querySelector('p') as HTMLElement;
    const r = document.createRange();
    r.setStart(p.firstChild as Node, 1);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);

    fireEvent.click(getByRole('button', { name: 'Hello' }));
    expect(editable.textContent).toContain('Hello from plugin');
  });

  it('a custom plugin button can read EditorState via useChrome', () => {
    const probe = definePlugin({
      name: 'probe',
      buttons: {
        probe: function Probe(): JSX.Element {
          const { state } = useChrome();
          const cmd = useCommand();
          return (
            <button type="button" aria-label="Probe" data-bold={String(state.bold)} onClick={() => cmd('bold')}>
              probe
            </button>
          );
        },
      },
    });
    const { container, getByRole } = render(
      <SummernoteEditor defaultValue="<p>hi</p>" plugins={[probe]} toolbar={[['insert', ['probe']]]} />,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);
    expect(getByRole('button', { name: 'Probe' }).getAttribute('data-bold')).toBe('false');
    fireEvent.click(getByRole('button', { name: 'Probe' }));
    expect(getByRole('button', { name: 'Probe' }).getAttribute('data-bold')).toBe('true');
  });

  it('exposes an imperative handle (getCode/setCode/command/focus)', () => {
    const ref = createRef<SummernoteEditorHandle>();
    const { container } = render(<SummernoteEditor ref={ref} defaultValue="<p>hi</p>" />);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.getCode()).toBe('<p>hi</p>');

    act(() => ref.current!.setCode('<p>set</p>'));
    const editable = container.querySelector('.note-editable') as HTMLElement;
    expect(editable.innerHTML).toBe('<p>set</p>');

    selectContents(editable.querySelector('p') as HTMLElement);
    act(() => {
      ref.current!.command('bold');
    });
    expect(editable.innerHTML).toBe('<p><b>set</b></p>');
    act(() => ref.current!.undo());
    expect(editable.innerHTML).toBe('<p>set</p>');
  });
});
