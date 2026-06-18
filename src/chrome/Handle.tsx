import { useRef } from 'react';

export interface HandleProps {
  /** the selected image. */
  img: HTMLImageElement;
  /** position of the image within the editing-area. */
  top: number;
  left: number;
  width: number;
  height: number;
  /** called after a resize so the chrome can re-read sizes. */
  onResize?: () => void;
}

/**
 * Image resize handle frame (port of the lite Handle). The SE-corner handle drags to resize the
 * image width. Pointer Events + setPointerCapture so it works for touch + mouse, releasing
 * on pointercancel; touch-action:none stops scroll/zoom stealing the gesture. The handle element
 * is NOT re-rendered mid-drag (would drop the pointer capture).
 */
export function Handle({ img, top, left, width, height, onResize }: HandleProps): JSX.Element {
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startW: img.offsetWidth };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) {
      return;
    }
    const w = Math.max(10, drag.current.startW + (e.clientX - drag.current.startX));
    img.style.width = `${w}px`; // mutate directly; do NOT re-render mid-drag (drops pointer capture)
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    const wasDragging = drag.current !== null;
    drag.current = null;
    const t = e.target as HTMLElement;
    if (t.hasPointerCapture(e.pointerId)) {
      t.releasePointerCapture(e.pointerId);
    }
    if (wasDragging) {
      onResize?.(); // re-measure once, after the gesture — frame + size readout reflect the result
    }
  };

  return (
    <div
      className="note-control-selection"
      style={{ position: 'absolute', display: 'block', top, left, width, height }}
    >
      <div className="note-control-selection-bg" />
      <div className="note-control-holder note-control-nw" />
      <div className="note-control-holder note-control-ne" />
      <div className="note-control-holder note-control-sw" />
      <div
        className="note-control-holder note-control-se note-control-sizing"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <div className="note-control-selection-info">
        {Math.round(width)}x{Math.round(height)}
      </div>
    </div>
  );
}
