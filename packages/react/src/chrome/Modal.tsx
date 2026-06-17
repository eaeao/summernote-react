import { useEffect, useRef, type ReactNode } from 'react';
import { useChrome } from './ChromeContext';

export interface ModalProps {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  /** extra class on .note-modal (e.g. link-dialog). */
  className?: string;
}

/**
 * Standalone modal (no Bootstrap JS) — port of the lite ModalUI. Backdrop + dialog box, Escape /
 * backdrop-click close, focus moves into the dialog on open. Preserves the .note-modal(-backdrop)
 * class contract. Dialogs render their form inside and resolve on submit (restoreRange first).
 */
export function Modal({ title, onClose, footer, children, className }: ModalProps): JSX.Element {
  const { options } = useChrome();
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    // focus the first field in the dialog
    const first = boxRef.current?.querySelector<HTMLElement>('input, textarea, button, [tabindex]');
    first?.focus();
    return (): void => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="note-modal-wrapper">
      <div className="note-modal-backdrop" style={{ display: 'block' }} onClick={onClose} />
      <div
        className={`note-modal${className ? ' ' + className : ''}`}
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="note-modal-content" ref={boxRef}>
          <div className="note-modal-header">
            <button
              type="button"
              className="close"
              aria-label="Close"
              onClick={onClose}
            >
              <span className={options.icons.close} aria-hidden="true" />
            </button>
            <h4 className="note-modal-title">{title}</h4>
          </div>
          <div className="note-modal-body">{children}</div>
          {footer ? <div className="note-modal-footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
