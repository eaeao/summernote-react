import type { ReactNode } from 'react';
import type { ToolbarGroup } from '@summernote/core';
import { useChrome } from '../chrome/ChromeContext';
import { ToolbarItem, isKnownItem } from './registry';

export interface ToolbarProps {
  /** `[group, names]` config; defaults to the editor's options.toolbar. */
  config?: readonly ToolbarGroup[];
  /** render an unknown button name (plugin/custom buttons); return null to skip. */
  renderCustom?: (name: string) => ReactNode;
}

/**
 * Renders the toolbar from a `[group, names]` config (summernote's options.toolbar shape) via the
 * item registry. Stateless and fully driven by the published EditorState through ChromeContext —
 * chrome re-renders never touch the engine-owned editable subtree. Preserves the .note-toolbar /
 * .note-btn-group / .note-btn / note-icon-* class contract.
 */
export function Toolbar({ config, renderCustom }: ToolbarProps): JSX.Element {
  const { options } = useChrome();
  const groups = config ?? options.toolbar;
  return (
    <div className="note-toolbar note-btn-toolbar" role="toolbar">
      {groups.map(([group, names]) => (
        <div key={group} className={`note-btn-group note-${group}`}>
          {names.map((name) =>
            isKnownItem(name) ? <ToolbarItem key={name} name={name} /> : renderCustom ? (
              <span key={name}>{renderCustom(name)}</span>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}
