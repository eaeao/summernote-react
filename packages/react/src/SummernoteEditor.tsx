import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultOptions, langEnUS, type EditorCoreOptions, type ToolbarGroup } from '@summernote/core';
import { useSummernote } from './useSummernote';
import { Toolbar } from './toolbar/Toolbar';
import { ChromeProvider, type ChromeValue, type ChromeUI } from './chrome/ChromeContext';
import { LinkDialog, ImageDialog, VideoDialog, HelpDialog } from './chrome/dialogs';

type DialogKind = 'link' | 'image' | 'video' | 'help' | null;

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

  const [dialog, setDialog] = useState<DialogKind>(null);
  const closeDialog = useCallback((): void => {
    setDialog(null);
    core?.focus();
  }, [core]);

  const ui = useMemo<Partial<ChromeUI>>(() => {
    const open = (kind: DialogKind): void => {
      core?.saveRange(); // capture the selection before focus moves into the dialog
      setDialog(kind);
    };
    return {
      openLinkDialog: () => open('link'),
      openImageDialog: () => open('image'),
      openVideoDialog: () => open('video'),
      openHelpDialog: () => open('help'),
      // fullscreen / codeview land in the statusbar/view track
    };
  }, [core]);

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
        {dialog === 'link' ? <LinkDialog onClose={closeDialog} /> : null}
        {dialog === 'image' ? <ImageDialog onClose={closeDialog} /> : null}
        {dialog === 'video' ? <VideoDialog onClose={closeDialog} /> : null}
        {dialog === 'help' ? <HelpDialog onClose={closeDialog} /> : null}
      </div>
    </ChromeProvider>
  );
}
