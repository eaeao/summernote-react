import { useEffect, useReducer, type RefObject } from 'react';
import { env } from '@eaeao4jerry/summernote-core';
import { useChrome } from './ChromeContext';
import { AirPopover } from './AirPopover';

export interface AirPopoverHostProps {
  editingAreaRef: RefObject<HTMLDivElement | null>;
}

/**
 * Drives the air-mode floating toolbar: shows it at the current NON-collapsed selection inside the
 * editable, hides it otherwise. Positions via the selection's client rect relative to the editing
 * area, accounting for visualViewport offset (soft-keyboard-shifted viewport, §13.3). On coarse
 * pointers it sits below the selection (mobile callout avoidance).
 */
export function AirPopoverHost({ editingAreaRef }: AirPopoverHostProps): JSX.Element | null {
  const { core, options, codeviewActive } = useChrome();
  const [, repaint] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    if (!core) {
      return undefined;
    }
    const onSel = (): void => repaint();
    document.addEventListener('selectionchange', onSel);
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    vv?.addEventListener('resize', onSel);
    vv?.addEventListener('scroll', onSel);
    return (): void => {
      document.removeEventListener('selectionchange', onSel);
      vv?.removeEventListener('resize', onSel);
      vv?.removeEventListener('scroll', onSel);
    };
  }, [core]);

  if (codeviewActive || !core) {
    return null;
  }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
    return null;
  }
  const range = sel.getRangeAt(0);
  if (!core.editable.contains(range.startContainer)) {
    return null;
  }

  const rects = range.getClientRects();
  const rect = rects.length > 0 ? rects[rects.length - 1]! : range.getBoundingClientRect();
  const area = editingAreaRef.current;
  const a = area ? area.getBoundingClientRect() : { top: 0, left: 0 };
  // visualViewport offset keeps the popover anchored when the soft keyboard shrinks the viewport
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const vvTop = vv ? vv.offsetTop : 0;
  const vvLeft = vv ? vv.offsetLeft : 0;

  const below = env.isCoarsePointer;
  const top = (below ? rect.bottom : rect.top) - a.top + vvTop;
  const left = rect.left - a.left + vvLeft;

  return <AirPopover config={options.popover.air} top={top} left={left} below={below} />;
}
