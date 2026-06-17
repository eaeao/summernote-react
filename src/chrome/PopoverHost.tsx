import { useEffect, useReducer, useRef, useState, type RefObject } from 'react';
import { useChrome } from './ChromeContext';
import { LinkPopover, TablePopover, ImagePopover } from './popovers';
import { Handle } from './Handle';

export interface PopoverHostProps {
  editingAreaRef: RefObject<HTMLDivElement | null>;
}

interface Pos {
  top: number;
  left: number;
}

// gap between a popover and its target. The popover renders ABOVE the target (.note-popover has
// transform: translateY(-100%)), so we anchor at the target's TOP minus this gap — the popover's
// bottom then lands just above the target and never covers the caret/cell.
const POPOVER_GAP = 5;

function posWithin(el: HTMLElement, area: HTMLElement | null): Pos {
  if (!area) {
    return { top: 0, left: 0 };
  }
  const r = el.getBoundingClientRect();
  const a = area.getBoundingClientRect();
  return { top: r.top - a.top - POPOVER_GAP, left: r.left - a.left };
}

function closestEl(selector: string): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return null;
  }
  const node = sel.getRangeAt(0).startContainer;
  const elNode = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return elNode ? (elNode.closest(selector) as HTMLElement | null) : null;
}

/**
 * Renders the contextual popover for the current selection: image (with resize Handle), link, or
 * table — mutually exclusive, mirroring the legacy precedence. Image selection is tracked via a
 * click listener on the editable (contentEditable image clicks don't move the caret reliably).
 * Re-renders on every EditorState change (ChromeContext), so the popover follows the selection.
 */
export function PopoverHost({ editingAreaRef }: PopoverHostProps): JSX.Element | null {
  const { core, state, codeviewActive } = useChrome();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(image);
  imageRef.current = image;
  // bump on selectionchange so positions recompute when the caret moves WITHIN the same format
  // context (EditorState is referentially stable then, so it wouldn't otherwise re-render).
  const [, repaint] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    const editable = core?.editable;
    if (!editable) {
      return undefined;
    }
    const onClick = (e: MouseEvent): void => {
      const t = e.target as HTMLElement;
      setImage(t.tagName === 'IMG' ? (t as HTMLImageElement) : null);
    };
    const onKeyDown = (): void => setImage(null);
    const onSelectionChange = (): void => {
      // clear a stale image selection once the caret lands in text (so it stops masking the
      // link/table popover), then repaint positions.
      if (imageRef.current) {
        const sel = window.getSelection();
        const node = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
        if (node && node.nodeType === Node.TEXT_NODE) {
          setImage(null);
        }
      }
      repaint();
    };
    editable.addEventListener('click', onClick);
    editable.addEventListener('keydown', onKeyDown);
    document.addEventListener('selectionchange', onSelectionChange);
    return (): void => {
      editable.removeEventListener('click', onClick);
      editable.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [core]);

  if (codeviewActive) {
    return null;
  }
  const area = editingAreaRef.current;

  // precedence: image > link > table (matches the legacy popover ordering)
  if (image && image.isConnected) {
    const pos = posWithin(image, area);
    const r = area ? image.getBoundingClientRect() : null;
    const a = area ? area.getBoundingClientRect() : null;
    return (
      <>
        <ImagePopover img={image} pos={pos} onAfterRemove={() => setImage(null)} />
        {r && a ? (
          <Handle
            img={image}
            top={r.top - a.top}
            left={r.left - a.left}
            width={r.width}
            height={r.height}
            onResize={repaint}
          />
        ) : null}
      </>
    );
  }

  if (state.link) {
    const anchor = closestEl('a');
    if (anchor) {
      return <LinkPopover href={anchor.getAttribute('href') ?? ''} pos={posWithin(anchor, area)} />;
    }
  }

  if (state.inTable) {
    const cell = closestEl('td,th');
    if (cell) {
      return <TablePopover pos={posWithin(cell, area)} />;
    }
  }

  return null;
}
