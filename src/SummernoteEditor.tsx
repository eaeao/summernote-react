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
import {
  defaultOptions,
  langEnUS,
  resolveLang,
  purifyCodeview,
  type CommandName,
  type EditorCore,
  type EditorCoreOptions,
  type LangPartial,
  type ToolbarGroup,
} from '@engine';
import { useSummernote } from './useSummernote';
import { Toolbar } from './toolbar/Toolbar';
import { ChromeProvider, type ChromeValue, type ChromeUI, type ImageUploadHandler } from './chrome/ChromeContext';
import { LinkDialog, ImageDialog, VideoDialog, HelpDialog } from './chrome/dialogs';
import { Codeview } from './chrome/Codeview';
import { Statusbar } from './chrome/Statusbar';
import { Placeholder } from './chrome/Placeholder';
import { PopoverHost } from './chrome/PopoverHost';
import { AirPopoverHost } from './chrome/AirPopoverHost';
import type { SummernotePlugin } from './plugin';

type DialogKind = 'link' | 'image' | 'video' | 'help' | null;

/** imperative API exposed via a ref on <SummernoteEditor>. */
export interface SummernoteEditorHandle {
  focus(): void;
  getCode(): string;
  setCode(html: string): void;
  command(name: CommandName | (string & {}), ...args: unknown[]): boolean;
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
  /** air mode: no fixed toolbar/statusbar; a floating toolbar appears at the selection. */
  airMode?: boolean;
  /** plugins: per-instance commands + custom toolbar buttons. */
  plugins?: readonly SummernotePlugin[];
  /** visual theme (per-instance — multiple editors with different themes can coexist). */
  theme?: 'lite' | 'bs3' | 'bs4' | 'bs5';
  /** locale (a LangPartial deep-merged over en-US), e.g. lang={locales['ko-KR']}. */
  lang?: LangPartial;
  /** image-upload hook: called once per picked File instead of the default base64 embed; return (or
   *  resolve to) the image src to insert. `onImageUpload={(file) => uploadToServer(file)}` */
  onImageUpload?: ImageUploadHandler;
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
  const {
    value,
    defaultValue,
    onChange,
    options,
    toolbar,
    placeholder,
    disableResize,
    airMode,
    plugins,
    theme,
    lang,
    onImageUpload,
    className,
  } = props;
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

  const chromeOptions = useMemo(
    () => (toolbar ? { ...defaultOptions, toolbar } : defaultOptions),
    [toolbar],
  );

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [codeview, setCodeview] = useState(false);
  const [codeHtml, setCodeHtml] = useState('');
  // latest codeview state read by stable handlers (keeps `ui`/`chrome` identity off codeHtml).
  const codeStateRef = useRef({ codeview, codeHtml });
  codeStateRef.current = { codeview, codeHtml };

  // Controlled: push an external value into the engine ONLY when it genuinely differs AND is not
  // an echo of our own onChange (lastEmitted guard) — prevents caret-destroying re-seeds. While
  // codeview is open the textarea owns the content, so route the external value there instead.
  useEffect(() => {
    if (value === undefined || core === null) {
      return;
    }
    if (codeview) {
      if (value !== codeHtml) {
        setCodeHtml(value);
      }
      return;
    }
    if (value === lastEmitted.current || value === core.getHTML()) {
      return;
    }
    core.setHTML(value);
  }, [value, core, codeview, codeHtml]);

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
        // read latest codeview state from a ref so this handler (and `ui`/`chrome`) stays stable
        // across codeview keystrokes — no per-keystroke chrome re-render.
        const cs = codeStateRef.current;
        if (cs.codeview) {
          // leaving: PURIFY the (attacker-influenceable) textarea HTML before applying it — the
          // codeview XSS gate (matches the legacy codeviewFilter:true default).
          core?.setHTML(purifyCodeview(cs.codeHtml));
          core?.focus();
          setCodeview(false);
        } else {
          setCodeHtml(core?.getHTML() ?? ''); // entering: snapshot the HTML into the textarea
          setCodeview(true);
        }
      },
    };
  }, [core]);

  // route keyboard-shortcut methods that aren't editing commands to the chrome UI
  shortcutRef.current = (method: string): boolean => {
    if (method === 'linkDialog.show') {
      ui.openLinkDialog?.();
      return true;
    }
    return false;
  };

  const resolvedLang = useMemo(() => (lang ? resolveLang(lang) : langEnUS), [lang]);

  const chrome = useMemo<ChromeValue>(
    () => ({
      core,
      state,
      lang: resolvedLang,
      options: chromeOptions,
      ui,
      codeviewActive: codeview,
      ...(onImageUpload ? { onImageUpload } : {}),
    }),
    [core, state, resolvedLang, chromeOptions, ui, codeview, onImageUpload],
  );

  const rootClass = [
    'note-editor',
    'note-frame',
    `note-theme-${theme ?? 'lite'}`,
    airMode ? 'note-airframe' : '',
    fullscreen ? 'fullscreen' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const showPlaceholder = !codeview && placeholder !== undefined && placeholder !== '' && isEmptyHtml(html);

  return (
    <ChromeProvider value={chrome}>
      <div className={rootClass}>
        {/* air mode: no fixed toolbar — a floating one appears at the selection */}
        {airMode ? null : <Toolbar renderCustom={renderCustom} />}
        <div className="note-editing-area" ref={editingAreaRef} style={{ position: 'relative' }}>
          {showPlaceholder ? <Placeholder text={placeholder} visible /> : null}
          <div
            ref={editableRef}
            className="note-editable notranslate"
            contentEditable={!codeview}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            // Opt out of browser extensions that inject into / overlay the contentEditable and
            // hijack the selection when a toolbar button is pressed — the engine owns this subtree.
            // Google Translate (its #gtx-trans selection bubble) honours translate="no" / notranslate
            // — which also stops page-translation from rewriting the editor content; Grammarly honours
            // the data-gramm* flags.
            translate="no"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            style={codeview ? { display: 'none' } : undefined}
          />
          {codeview ? <Codeview value={codeHtml} onChange={setCodeHtml} /> : null}
          <PopoverHost editingAreaRef={editingAreaRef} />
          {airMode ? <AirPopoverHost editingAreaRef={editingAreaRef} /> : null}
        </div>
        {!airMode && !disableResize && !codeview ? <Statusbar targetRef={editableRef} /> : null}
        {dialog === 'link' ? <LinkDialog onClose={closeDialog} /> : null}
        {dialog === 'image' ? <ImageDialog onClose={closeDialog} /> : null}
        {dialog === 'video' ? <VideoDialog onClose={closeDialog} /> : null}
        {dialog === 'help' ? <HelpDialog onClose={closeDialog} /> : null}
      </div>
    </ChromeProvider>
  );
  },
);
