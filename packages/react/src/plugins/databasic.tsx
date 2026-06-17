import { useChrome, useCommand } from '../chrome/ChromeContext';
import { definePlugin } from '../plugin';

/**
 * databasic reference plugin (simplified port of public/plugin/databasic) — inserts a basic data
 * table at the caret via a registered command. Demonstrates composing the plugin API with the
 * engine's own insertNode command (the legacy plugin's <data>-element + popover sizing is beyond a
 * reference; this shows the contract).
 */
function DataBasicButton(): JSX.Element {
  const { options } = useChrome();
  const cmd = useCommand();
  return (
    <button
      type="button"
      className="note-btn note-btn-databasic"
      title="Insert basic data table"
      aria-label="Insert basic data table"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd('insertDataBasic')}
    >
      <span className={options.icons.table} aria-hidden="true" />
    </button>
  );
}

export const databasicPlugin = definePlugin({
  name: 'databasic',
  commands: {
    insertDataBasic: (core): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        return false;
      }
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) {
        return false;
      }
      const table = document.createElement('table');
      table.className = 'table table-bordered note-data-basic';
      table.innerHTML =
        '<thead><tr><th>Key</th><th>Value</th></tr></thead>' +
        '<tbody><tr><td>a</td><td>1</td></tr><tr><td>b</td><td>2</td></tr></tbody>';
      range.deleteContents();
      range.insertNode(table);
      range.setStartAfter(table);
      range.collapse(true);
      return true;
    },
  },
  buttons: {
    databasic: DataBasicButton,
  },
});
