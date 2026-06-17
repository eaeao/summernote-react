import { useChrome, useCommand } from '../chrome/ChromeContext';
import { definePlugin } from '../plugin';

/**
 * Reference plugin (port of public/plugin/hello) — a toolbar button that inserts a greeting via a
 * registered command. Demonstrates the per-instance command + custom-button contract. Add `'hello'`
 * to a toolbar group to show it, e.g. toolbar={[['insert', ['hello']]]}.
 */
function HelloButton(): JSX.Element {
  const { options } = useChrome();
  const cmd = useCommand();
  return (
    <button
      type="button"
      className="note-btn note-btn-hello"
      title="Hello"
      aria-label="Hello"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd('hello')}
    >
      <span className={options.icons.question} aria-hidden="true" />
    </button>
  );
}

export const helloPlugin = definePlugin({
  name: 'hello',
  commands: {
    hello: (core): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        return false;
      }
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) {
        return false;
      }
      range.deleteContents();
      range.insertNode(document.createTextNode('Hello from plugin'));
      range.collapse(false);
      return true;
    },
  },
  buttons: {
    hello: HelloButton,
  },
});
