import { useRef, useState } from 'react';
import {
  SummernoteEditor,
  definePlugin,
  useCommand,
  locales,
  localeCodes,
  type SummernoteEditorHandle,
  type ThemeName,
  type ToolbarGroup,
} from '@eaeao/summernote-react';

// ── a tiny custom plugin: a toolbar button that inserts the current timestamp ──────────────
function TimestampButton(): JSX.Element {
  const cmd = useCommand();
  return (
    <button
      type="button"
      className="note-btn note-btn-timestamp"
      title="Insert timestamp"
      aria-label="Insert timestamp"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd('insertTimestamp')}
    >
      🕒
    </button>
  );
}

const timestampPlugin = definePlugin({
  name: 'timestamp',
  commands: {
    insertTimestamp: (core): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) return false;
      range.deleteContents();
      range.insertNode(document.createTextNode(new Date().toLocaleString()));
      range.collapse(false);
      return true;
    },
  },
  buttons: { timestamp: TimestampButton },
});

// default toolbar + the plugin's timestamp button in the insert group
const TOOLBAR: ToolbarGroup[] = [
  ['style', ['style']],
  ['font', ['bold', 'italic', 'underline', 'clear']],
  ['fontname', ['fontname']],
  ['fontsize', ['fontsize']],
  ['color', ['color']],
  ['para', ['ul', 'ol', 'paragraph']],
  ['height', ['height']],
  ['table', ['table']],
  ['insert', ['link', 'picture', 'video', 'timestamp']],
  ['view', ['fullscreen', 'codeview', 'help']],
];

const THEMES: ThemeName[] = ['lite', 'bs3', 'bs4', 'bs5'];
const LOCALE_OPTIONS = ['en-US', ...localeCodes];

export function App(): JSX.Element {
  const [theme, setTheme] = useState<ThemeName>('lite');
  const [locale, setLocale] = useState('en-US');
  const [airMode, setAirMode] = useState(false);
  const [html, setHtml] = useState(
    '<p>Hello <b>summernote-react</b> 👋</p><p>Try the toolbar, themes, locales, and the 🕒 plugin button.</p>',
  );
  const ref = useRef<SummernoteEditorHandle>(null);

  const lang = locale === 'en-US' ? undefined : locales[locale];

  return (
    <div className="demo">
      <header className="demo-header">
        <h1>@eaeao/summernote-react</h1>
        <p>
          React + TypeScript port of summernote — zero runtime deps, no jQuery, no <code>execCommand</code>.
        </p>
      </header>

      <div className="demo-controls">
        <label>
          Theme&nbsp;
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeName)}>
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Locale&nbsp;
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            {LOCALE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={airMode} onChange={(e) => setAirMode(e.target.checked)} /> Air mode
        </label>
        <span className="demo-spacer" />
        <button type="button" onClick={() => ref.current?.command('bold')}>
          ref.command(&apos;bold&apos;)
        </button>
        <button type="button" onClick={() => alert(ref.current?.getCode())}>
          ref.getCode()
        </button>
        <button type="button" onClick={() => ref.current?.setCode('<p>set via ref</p>')}>
          ref.setCode()
        </button>
      </div>

      <div className="demo-grid">
        <section>
          <h2>Editor</h2>
          {/* key forces a remount when air mode toggles (it changes the chrome layout) */}
          <SummernoteEditor
            key={airMode ? 'air' : 'frame'}
            ref={ref}
            value={html}
            onChange={setHtml}
            theme={theme}
            lang={lang}
            airMode={airMode}
            placeholder="Write something…"
            toolbar={TOOLBAR}
            plugins={[timestampPlugin]}
          />
        </section>

        <section>
          <h2>onChange HTML</h2>
          <pre className="demo-output">{html}</pre>

          <h2>Second editor (bs5, coexists)</h2>
          <SummernoteEditor
            theme="bs5"
            defaultValue="<p>A second editor with a <i>different theme</i> on the same page.</p>"
            toolbar={[['font', ['bold', 'italic', 'underline']], ['para', ['ul', 'ol']]]}
          />
        </section>
      </div>

      <footer className="demo-footer">
        <a href="https://www.npmjs.com/package/@eaeao/summernote-react">npm</a> ·{' '}
        <code>npm i @eaeao/summernote-react</code>
      </footer>
    </div>
  );
}
