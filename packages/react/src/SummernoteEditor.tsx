import { useEffect, useRef } from 'react';
import type { EditorCoreOptions } from '@summernote/core';
import { useSummernote } from './useSummernote';

export interface SummernoteEditorProps {
  /** controlled HTML value */
  value?: string;
  /** uncontrolled initial HTML (applied once) */
  defaultValue?: string;
  onChange?: (html: string) => void;
  options?: Omit<EditorCoreOptions, 'value' | 'onChange'>;
  className?: string;
}

/**
 * Controlled/uncontrolled React editor. React renders ONLY the chrome (toolbar) plus a single
 * leaf: an uncontrolled contentEditable div the engine owns. React never renders children into
 * the editable, so chrome re-renders cannot disturb the caret (the React-vs-contentEditable fix).
 */
export function SummernoteEditor(props: SummernoteEditorProps): JSX.Element {
  const { value, defaultValue, onChange, options, className } = props;
  const lastEmitted = useRef<string | null>(null);

  const coreOptions: EditorCoreOptions = { ...(options ?? {}) };
  const initial = value ?? defaultValue;
  if (initial !== undefined) {
    coreOptions.value = initial;
  }
  coreOptions.onChange = (html: string): void => {
    lastEmitted.current = html;
    onChange?.(html);
  };

  const { editableRef, core, state } = useSummernote(coreOptions);

  // Controlled: push an external value into the engine ONLY when it genuinely differs AND is not
  // an echo of our own onChange (lastEmitted guard) — prevents caret-destroying re-seeds.
  useEffect(() => {
    if (value === undefined || core === null) {
      return;
    }
    if (value === lastEmitted.current || value === core.getHTML()) {
      return;
    }
    core.setHTML(value);
  }, [value, core]);

  return (
    <div className={className ? `note-editor ${className}` : 'note-editor'}>
      <div className="note-toolbar" role="toolbar">
        <button
          type="button"
          className="note-btn note-btn-bold"
          aria-pressed={state.bold}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => core?.command('bold')}
        >
          Bold
        </button>
        <button
          type="button"
          className="note-btn note-btn-undo"
          disabled={!state.canUndo}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => core?.command('undo')}
        >
          Undo
        </button>
      </div>
      <div
        ref={editableRef}
        className="note-editable"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
      />
    </div>
  );
}
