import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { defaultOptions, langEnUS, type EditorCore, type EditorCoreOptions, type ToolbarGroup } from '@summernote/core';
import { useSummernote } from './useSummernote';
import { Toolbar } from './toolbar/Toolbar';
import { ChromeProvider, type ChromeValue, type ChromeUI } from './chrome/ChromeContext';
import { LinkDialog, ImageDialog, VideoDialog, HelpDialog } from './chrome/dialogs';
import { Codeview } from './chrome/Codeview';
import { Statusbar } from './chrome/Statusbar';
import { Placeholder } from './chrome/Placeholder';
import { PopoverHost } from './chrome/PopoverHost';
import type { SummernotePlugin } from './plugin';

type DialogKind = 'link' | 'image' | 'video' | 'help' | null;

/** imperative API exposed via a ref on <SummernoteEditor>. */
export interface SummernoteEditorHandle {
  focus(): void;
  getCode(): string;
  setCode(html: string): void;
  command(name: string, ...args: unknown[]): boolean;
  undo(): void;
  redo(): void;
  readonly core: EditorCore | null;
}

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
  /** plugins: per-instance commands + custom toolbar buttons. */
  plugins?: readonly SummernotePlugin[];
  className?: string;
}

/**
 * Controlled/uncontrolled React editor. React renders ONLY the chrome (toolbar/dropdowns/dialogs/
 * statusbar/...) plus a single leaf: an uncontrolled contentEditable div the engine owns. React
 * never renders children into the editable, so chrome re-renders cannot disturb the caret (the
 * React-vs-contentEditable fix). All chrome reads the published EditorState + options/lang via
 * ChromeContext.
 */
export const SummernoteEditor = forwardRef<SummernoteEditorHandle, SummernoteEditorProps>(
  function SummernoteEditor(props, ref): JSX.Element {
  const { value, defaultValue, onChange, options, toolbar, placeholder, disableResize, plugins, className } = props;
  const lastEmitted = useRef<string | null>(null);
  const editingAreaRef = useRef<HTMLDivElement | null>(null);
  const initial = value ?? defaultValue;
  const [html, setHtml] = useState<string>(initial ?? '');

  // shortcut methods that aren't editing commands route here (read latest ui via a stable ref)
  const shortcutRef = useRef<(method: string) => boolean>(() => false);

  const coreOptions: EditorCoreOptions = { ...(options ?? {}) };
  if (initial !== undefined) {
    coreOptions.value = initial;
  }
  coreOptions.onChange = (next: string): void => {
    lastEmitted.current = next;
    setHtml(next);
    onChange?.(next);
  };
  coreOptions.onShortcut = (method: string): boolean => shortcutRef.current(method);

  const { editableRef, core, state } = useSummernote(coreOptions);

  // register plugin commands once the engine is live
  useEffect(() => {
    if (!core || !plugins) {
      return;
    }
    for (const plugin of plugins) {
      if (plugin.commands) {
        for (const [name, fn] of Object.entries(plugin.commands)) {
          core.registerCommand(name, fn);
        }
      }
    }
  }, [core, plugins]);

  // custom toolbar buttons contributed by plugins (rendered via the toolbar's renderCustom slot)
  const pluginButtons = useMemo<Record<string, FC>>(() => {
    const map: Record<string, FC> = {};
    for (const plugin of plugins ?? []) {
      Object.assign(map, plugin.buttons);
    }
    return map;
  }, [plugins]);
  const renderCustom = useCallback(
    (name: string): ReactNode => {
      const Comp = pluginButtons[name];
      return Comp ? createElement(Comp) : null;
    },
    [pluginButtons],
  );

  // imperative API via ref
  useImperativeHandle(
    ref,
    (): SummernoteEditorHandle => ({
      focus: () => core?.focus(),
      getCode: () => core?.getHTML() ?? '',
      setCode: (h: string) => core?.setHTML(h),
      command: (name: string, ...args: unknown[]) => core?.command(name, ...args) ?? false,
      undo: () => {
        core?.command('undo');
      },
      redo: () => {
        core?.command('redo');
      },
      core,
    }),
    [core],
  );

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

  // route keyboard-shortcut methods that aren't editing commands to the chrome UI
  shortcutRef.current = (method: string): boolean => {
    if (method === 'linkDialog.show') {
      ui.openLinkDialog?.();
      return true;
    }
    return false;
  };

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
        <Toolbar renderCustom={renderCustom} />
        <div className="note-editing-area" ref={editingAreaRef} style={{ position: 'relative' }}>
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
          <PopoverHost editingAreaRef={editingAreaRef} />
        </div>
        {!disableResize && !codeview ? <Statusbar targetRef={editableRef} /> : null}
        {dialog === 'link' ? <LinkDialog onClose={closeDialog} /> : null}
        {dialog === 'image' ? <ImageDialog onClose={closeDialog} /> : null}
        {dialog === 'video' ? <VideoDialog onClose={closeDialog} /> : null}
        {dialog === 'help' ? <HelpDialog onClose={closeDialog} /> : null}
      </div>
    </ChromeProvider>
  );
  },
);
