import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface DropdownProps {
  /** toggle-button contents (icon + optional current-value label). */
  toggle: ReactNode;
  /** accessible name / tooltip for the toggle button. */
  title: string;
  /** extra class on the toggle button (e.g. note-btn-style). */
  toggleClassName?: string;
  /** dropdown-menu contents. */
  children: ReactNode;
  /** extra class on the .note-dropdown-menu (e.g. dropdown-fontname). */
  menuClassName?: string;
  /** right-align the menu (color picker). */
  alignRight?: boolean;
  /** disable the toggle (e.g. while codeview is active). */
  disabled?: boolean;
}

/**
 * Standalone dropdown (no Bootstrap JS) — port of the lite DropdownUI behavior, unified across
 * all themes per §11. Click toggles; outside-click / Escape / item-click close. Markup preserves
 * the .note-btn-group / .note-dropdown-toggle / .note-dropdown(-menu) class contract.
 */
export function Dropdown({
  toggle,
  title,
  toggleClassName,
  children,
  menuClassName,
  alignRight,
  disabled,
}: DropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocPointer = (e: MouseEvent): void => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return (): void => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={groupRef} className={`note-btn-group note-dropdown${open ? ' open' : ''}`}>
      <button
        type="button"
        className={`note-btn note-dropdown-toggle${toggleClassName ? ' ' + toggleClassName : ''}`}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        disabled={disabled}
        // mousedown must not blur the editable selection
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {toggle}
        <span className="note-icon-caret" aria-hidden="true" />
      </button>
      <div
        id={menuId}
        role="menu"
        className={`note-dropdown-menu${alignRight ? ' note-dropdown-menu-right' : ''}${
          menuClassName ? ' ' + menuClassName : ''
        }`}
        style={{ display: open ? 'block' : 'none' }}
        // clicking an item dispatches its command, then closes the menu
        onClick={() => setOpen(false)}
        onMouseDown={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </div>
  );
}
