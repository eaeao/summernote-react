import type { ReactNode } from 'react';

export interface PopoverProps {
  className?: string;
  top: number;
  left: number;
  children: ReactNode;
}

/**
 * Absolutely-positioned popover shell (port of the lite ui.popover). Positioned within the
 * editing-area (which is position:relative) at a target-derived {top,left}. Preserves the
 * .note-popover / .note-popover-content class contract. Mobile placement (below the selection,
 * §13.3) is handled by the caller computing `top`.
 */
export function Popover({ className, top, left, children }: PopoverProps): JSX.Element {
  return (
    <div
      className={`note-popover popover in${className ? ' ' + className : ''}`}
      style={{ position: 'absolute', top, left, display: 'block' }}
      role="toolbar"
    >
      <div className="note-popover-content note-children-container">{children}</div>
    </div>
  );
}
