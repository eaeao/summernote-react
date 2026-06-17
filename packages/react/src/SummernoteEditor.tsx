import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultOptions, langEnUS, type EditorCoreOptions, type ToolbarGroup } from '@summernote/core';
import { useSummernote } from './useSummernote';
import { Toolbar } from './toolbar/Toolbar';
import { ChromeProvider, type ChromeValue, type ChromeUI } from './chrome/ChromeContext';
import { LinkDialog, ImageDialog, VideoDialog, HelpDialog } from './chrome/dialogs';
import { Codeview } from './chrome/Codeview';
import { Statusbar } from './chrome/Statusbar';
import { Placeholder } from './chrome/Placeholder';

type DialogKind = 'link' | 'image' | 'video' | 'help' | null;

const EMPTY_RE = /^(<p>(<br\s*\/?>)?<\/p>|<br\s*\/?>)?\s*$/i;
function isEmptyHtml(html: string): boolean {
  return EMPTY_RE.test(html.trim());
}

export interface SummernoteEditorProps {
  /** controlled HTML value */
  value?: string;
  /** uncontrolled initial HTML (applied once) */
  defaultValue?: string;
  onChange?: (html: string) => void;
  options?: Omit<EditorCoreOptions, 'value' | 'onChange'>;
  /** `[group, names]` toolbar config; defaults to the summernote default toolbar. */
  toolbar?: readonly ToolbarGroup[];
  /** placeholder shown over an empty editable. */
  placeholder?: string;
  /** disable the resize statusbar. */
  disableResize?: boolean;
  className?: string;
}

/**
 * Controlled/uncontrolled React editor. React renders ONLY the chrome (toolbar/dropdowns/dialogs/
 * statusbar/...) plus a single leaf: an uncontrolled contentEditable div the engine owns. React
 * never renders children into the editable, so chrome re-renders cannot disturb the caret (the
 * React-vs-contentEditable fix). All chrome reads the published EditorState + options/lang via
 * ChromeContext.
 */
export function SummernoteEditor(props: SummernoteEditorProps): JSX.Element {
  const { value, defaultValue, onChange, options, toolbar, placeholder, disableResize, className } = props;
  const lastEmitted = useRef<string | null>(null);
  const initial = value ?? defaultValue;
  const [html, setHtml] = useState<string>(initial ?? '');

  const coreOptions: EditorCoreOptions = { ...(options ?? {}) };
  if (initial !== undefined) {
    coreOptions.value = initial;
  }
  coreOptions.onChange = (next: string): void => {
    lastEmitted.current = next;
    setHtml(next);
    onChange?.(next);
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
  const [fullscreen, setFullscreen] = useState(false);
  const [codeview, setCodeview] = useState(false);
  const [codeHtml, setCodeHtml] = useState('');

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
      toggleFullscreen: () => setFullscreen((f) => !f),
      toggleCodeview: () => {
        // side effects in the handler (not a state updater — StrictMode-safe)
        if (codeview) {
          core?.setHTML(codeHtml); // leaving: apply the edited HTML back to the engine
          core?.focus();
          setCodeview(false);
        } else {
          setCodeHtml(core?.getHTML() ?? ''); // entering: snapshot the HTML into the textarea
          setCodeview(true);
        }
      },
    };
  }, [core, codeview, codeHtml]);

  const chrome = useMemo<ChromeValue>(
    () => ({ core, state, lang: langEnUS, options: chromeOptions, ui, codeviewActive: codeview }),
    [core, state, chromeOptions, ui, codeview],
  );

  const rootClass = ['note-editor', 'note-frame', fullscreen ? 'fullscreen' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  const showPlaceholder = !codeview && placeholder !== undefined && placeholder !== '' && isEmptyHtml(html);

  return (
    <ChromeProvider value={chrome}>
      <div className={rootClass}>
        <Toolbar />
        <div className="note-editing-area">
          {showPlaceholder ? <Placeholder text={placeholder} visible /> : null}
          <div
            ref={editableRef}
            className="note-editable"
            contentEditable={!codeview}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            style={codeview ? { display: 'none' } : undefined}
          />
          {codeview ? <Codeview value={codeHtml} onChange={setCodeHtml} /> : null}
        </div>
        {!disableResize && !codeview ? <Statusbar targetRef={editableRef} /> : null}
        {dialog === 'link' ? <LinkDialog onClose={closeDialog} /> : null}
        {dialog === 'image' ? <ImageDialog onClose={closeDialog} /> : null}
        {dialog === 'video' ? <VideoDialog onClose={closeDialog} /> : null}
        {dialog === 'help' ? <HelpDialog onClose={closeDialog} /> : null}
      </div>
    </ChromeProvider>
  );
}
