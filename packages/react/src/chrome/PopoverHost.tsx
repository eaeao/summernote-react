import { useEffect, useState, type RefObject } from 'react';
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

function posWithin(el: HTMLElement, area: HTMLElement | null): Pos {
  if (!area) {
    return { top: 0, left: 0 };
  }
  const r = el.getBoundingClientRect();
  const a = area.getBoundingClientRect();
  return { top: r.top - a.top + el.offsetHeight, left: r.left - a.left };
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
    editable.addEventListener('click', onClick);
    editable.addEventListener('keydown', onKeyDown);
    return (): void => {
      editable.removeEventListener('click', onClick);
      editable.removeEventListener('keydown', onKeyDown);
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
          <Handle img={image} top={r.top - a.top} left={r.left - a.left} width={r.width} height={r.height} />
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
