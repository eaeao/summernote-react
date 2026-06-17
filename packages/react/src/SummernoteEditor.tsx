import { useEffect, useMemo, useRef } from 'react';
import { defaultOptions, langEnUS, type EditorCoreOptions, type ToolbarGroup } from '@summernote/core';
import { useSummernote } from './useSummernote';
import { Toolbar } from './toolbar/Toolbar';
import { ChromeProvider, type ChromeValue, type ChromeUI } from './chrome/ChromeContext';

export interface SummernoteEditorProps {
  /** controlled HTML value */
  value?: string;
  /** uncontrolled initial HTML (applied once) */
  defaultValue?: string;
  onChange?: (html: string) => void;
  options?: Omit<EditorCoreOptions, 'value' | 'onChange'>;
  /** `[group, names]` toolbar config; defaults to the summernote default toolbar. */
  toolbar?: readonly ToolbarGroup[];
  className?: string;
}

/**
 * Controlled/uncontrolled React editor. React renders ONLY the chrome (toolbar/dropdowns/...) plus
 * a single leaf: an uncontrolled contentEditable div the engine owns. React never renders children
 * into the editable, so chrome re-renders cannot disturb the caret (the React-vs-contentEditable
 * fix). All chrome reads the published EditorState + options/lang via ChromeContext.
 */
export function SummernoteEditor(props: SummernoteEditorProps): JSX.Element {
  const { value, defaultValue, onChange, options, toolbar, className } = props;
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

  const chromeOptions = useMemo(
    () => (toolbar ? { ...defaultOptions, toolbar } : defaultOptions),
    [toolbar],
  );

  // dialog/view handlers land in later tracks; empty until then (those buttons no-op).
  const ui = useMemo<Partial<ChromeUI>>(() => ({}), []);

  const chrome = useMemo<ChromeValue>(
    () => ({ core, state, lang: langEnUS, options: chromeOptions, ui }),
    [core, state, chromeOptions, ui],
  );

  return (
    <ChromeProvider value={chrome}>
      <div className={className ? `note-editor note-frame ${className}` : 'note-editor note-frame'}>
        <Toolbar />
        <div className="note-editing-area">
          <div
            ref={editableRef}
            className="note-editable"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
          />
        </div>
      </div>
    </ChromeProvider>
  );
}
