import { useRef, type RefObject } from 'react';

export interface StatusbarProps {
  /** the element whose height the drag adjusts (the editable). */
  targetRef: RefObject<HTMLElement | null>;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Resize statusbar — drag the bar to change the editable height. Uses Pointer Events with
 * setPointerCapture (PORTING-PLAN §13.3: works for touch + mouse, releases on pointercancel),
 * so mobile resize works where the legacy mouse-only handler did nothing. touch-action:none on
 * the bar prevents the gesture being stolen by scroll/zoom.
 */
export function Statusbar({ targetRef, minHeight = 50, maxHeight }: StatusbarProps): JSX.Element {
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const target = targetRef.current;
    if (!target) {
      return;
    }
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: target.offsetHeight };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const target = targetRef.current;
    if (!drag.current || !target) {
      return;
    }
    let h = drag.current.startH + (e.clientY - drag.current.startY);
    h = Math.max(minHeight, h);
    if (maxHeight) {
      h = Math.min(maxHeight, h);
    }
    target.style.height = `${h}px`;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    drag.current = null;
    const t = e.target as HTMLElement;
    if (t.hasPointerCapture(e.pointerId)) {
      t.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="note-statusbar" role="status" style={{ touchAction: 'none' }}>
      <div
        className="note-resizebar"
        aria-label="Resize"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="note-icon-bar" />
        <div className="note-icon-bar" />
        <div className="note-icon-bar" />
      </div>
    </div>
  );
}
