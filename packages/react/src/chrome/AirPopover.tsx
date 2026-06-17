import type { ToolbarGroup } from '@eaeao4jerry/summernote-core';
import { Popover } from './Popover';
import { ToolbarItem, isKnownItem } from '../toolbar/registry';

export interface AirPopoverProps {
  config: readonly ToolbarGroup[];
  top: number;
  left: number;
  /** when true, position below the selection (mobile — §13.3) instead of above. */
  below: boolean;
}

/**
 * Air-mode floating toolbar (port of AirPopover) — renders the air toolbar config at the current
 * selection. Reuses the toolbar item registry, so the same buttons/dropdowns work. On coarse
 * pointers it sits BELOW the selection to avoid the OS native selection callout (§13.3 — an
 * intentional divergence from the desktop above-placement).
 */
export function AirPopover({ config, top, left, below }: AirPopoverProps): JSX.Element {
  return (
    <Popover className={`note-air-popover${below ? ' note-air-below' : ''}`} top={top} left={left}>
      {config.map(([group, names]) => (
        <div key={group} className={`note-btn-group note-${group}`}>
          {names.map((name) => (isKnownItem(name) ? <ToolbarItem key={name} name={name} /> : null))}
        </div>
      ))}
    </Popover>
  );
}
