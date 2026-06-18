import { useRef, useState, type ReactNode } from 'react';
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
import { useLocale } from './components/useLocale';
import { t } from './components/ui-strings';

export interface Example {
  id: string;
  emoji: string;
  title: string;
  group: string;
  blurb: string;
  Component: () => JSX.Element;
}

// ── shared UI bits ──────────────────────────────────────────────────────────
function Snippet({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const s = t(useLocale()).pg;
  return (
    <details className="snippet" open>
      <summary>{s.code}</summary>
      <div style={{ position: 'relative' }}>
        <button
          className="btn"
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? s.copied : s.copy}
        </button>
        <pre className="codeblock">{code}</pre>
      </div>
    </details>
  );
}

function EditorCard({ children, code }: { children: ReactNode; code?: string }): JSX.Element {
  return (
    <div className="card">
      <div className="editor-wrap">{children}</div>
      {code ? <Snippet code={code} /> : null}
    </div>
  );
}

// ── examples ────────────────────────────────────────────────────────────────
function Basic(): JSX.Element {
  return (
    <EditorCard
      code={`import { SummernoteEditor } from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';

<SummernoteEditor defaultValue="<p>Hello</p>" onChange={setHtml} />`}
    >
      <SummernoteEditor defaultValue="<p>Hello <b>summernote-react</b> 👋</p><p>Edit me with the toolbar above.</p>" />
    </EditorCard>
  );
}

function Controlled(): JSX.Element {
  const [html, setHtml] = useState('<p>Type and watch the <b>HTML</b> update live.</p>');
  return (
    <div className="stack">
      <EditorCard
        code={`const [html, setHtml] = useState('<p>…</p>');
<SummernoteEditor value={html} onChange={setHtml} />`}
      >
        <SummernoteEditor value={html} onChange={setHtml} />
      </EditorCard>
      <div className="card">
        <div className="label">onChange HTML</div>
        <pre className="output">{html}</pre>
      </div>
    </div>
  );
}

function AirModeEx(): JSX.Element {
  return (
    <div className="stack">
      <div className="note-tip">✈️ No fixed toolbar — select some text to reveal the floating toolbar.</div>
      <EditorCard code={`<SummernoteEditor airMode defaultValue="<p>Select me…</p>" />`}>
        <SummernoteEditor airMode defaultValue="<p>Air mode: select this text and a toolbar appears right at the selection.</p>" />
      </EditorCard>
    </div>
  );
}

const THEMES: ThemeName[] = ['lite', 'bs3', 'bs4', 'bs5'];
function Themes(): JSX.Element {
  const [theme, setTheme] = useState<ThemeName>('bs5');
  return (
    <div className="stack">
      <div className="card card-pad row">
        <span className="muted">theme</span>
        {THEMES.map((t) => (
          <button key={t} className={`btn${t === theme ? ' btn-accent' : ''}`} onClick={() => setTheme(t)}>
            {t}
          </button>
        ))}
      </div>
      <EditorCard code={`<SummernoteEditor theme="${theme}" />
// import '@eaeao/summernote-react/themes/${theme}.css'  // (lite is the base)`}>
        <SummernoteEditor key={theme} theme={theme} defaultValue={`<p>Theme: <b>${theme}</b> — per-instance, themes can coexist.</p>`} />
      </EditorCard>
    </div>
  );
}

const LOCALE_OPTIONS = ['en-US', ...localeCodes];
function Localization(): JSX.Element {
  const [locale, setLocale] = useState('ko-KR');
  return (
    <div className="stack">
      <div className="card card-pad row">
        <span className="muted">locale ({LOCALE_OPTIONS.length})</span>
        <select className="field" value={locale} onChange={(e) => setLocale(e.target.value)}>
          {LOCALE_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="muted">→ hover toolbar buttons / open a dialog to see translations</span>
      </div>
      <EditorCard code={`import { locales } from '@eaeao/summernote-react';
<SummernoteEditor lang={locales['${locale}']} />`}>
        <SummernoteEditor
          key={locale}
          lang={locale === 'en-US' ? undefined : locales[locale]}
          defaultValue={`<p>Locale: <b>${locale}</b></p>`}
        />
      </EditorCard>
    </div>
  );
}

function Multiple(): JSX.Element {
  return (
    <div className="stack">
      <div className="note-tip">🧩 Independent editors on one page — each with its own theme &amp; state.</div>
      <EditorCard code={`<SummernoteEditor theme="lite" defaultValue="<p>A</p>" />
<SummernoteEditor theme="bs5"  defaultValue="<p>B</p>" />`}>
        <SummernoteEditor theme="lite" defaultValue="<p>Editor A — <i>lite</i> theme.</p>" toolbar={[['font', ['bold', 'italic', 'underline']]]} />
        <div style={{ height: 16 }} />
        <SummernoteEditor theme="bs5" defaultValue="<p>Editor B — <i>bs5</i> theme.</p>" toolbar={[['font', ['bold', 'italic', 'underline']]]} />
      </EditorCard>
    </div>
  );
}

function ClickToEdit(): JSX.Element {
  const [html, setHtml] = useState('<p>Click <b>Edit</b> to start editing this content, then <b>Save</b>.</p>');
  const [editing, setEditing] = useState(false);
  return (
    <div className="stack">
      <div className="card">
        <div className="card-pad row">
          {editing ? (
            <button className="btn btn-accent" onClick={() => setEditing(false)}>
              ✓ Save
            </button>
          ) : (
            <button className="btn btn-accent" onClick={() => setEditing(true)}>
              ✎ Edit
            </button>
          )}
          <span className="muted">{editing ? 'editing…' : 'read-only view'}</span>
        </div>
        {editing ? (
          <div className="editor-wrap">
            <SummernoteEditor value={html} onChange={setHtml} />
          </div>
        ) : (
          <div className="readview" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <Snippet
        code={`const [editing, setEditing] = useState(false);
{editing
  ? <SummernoteEditor value={html} onChange={setHtml} />
  : <div dangerouslySetInnerHTML={{ __html: html }} />}`}
      />
    </div>
  );
}

function CustomToolbar(): JSX.Element {
  const [minimal, setMinimal] = useState(true);
  const toolbar: ToolbarGroup[] = minimal
    ? [
        ['font', ['bold', 'italic', 'underline', 'clear']],
        ['para', ['ul', 'ol']],
      ]
    : [
        ['style', ['style']],
        ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['insert', ['link', 'picture', 'video']],
        ['view', ['fullscreen', 'codeview']],
      ];
  return (
    <div className="stack">
      <div className="card card-pad row">
        <label className="switch">
          <input type="checkbox" checked={minimal} onChange={(e) => setMinimal(e.target.checked)} /> minimal toolbar
        </label>
      </div>
      <EditorCard
        code={`const toolbar = [
  ['font', ['bold', 'italic', 'underline', 'clear']],
  ['para', ['ul', 'ol']],
];
<SummernoteEditor toolbar={toolbar} />`}
      >
        <SummernoteEditor key={minimal ? 'min' : 'full'} toolbar={toolbar} defaultValue="<p>Toolbar is just a <code>[group, names][]</code> config.</p>" />
      </EditorCard>
    </div>
  );
}

// a tiny custom plugin: button + command
function HighlightButton(): JSX.Element {
  const cmd = useCommand();
  return (
    <button
      type="button"
      className="note-btn"
      title="Highlight"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd('color', { backColor: '#fff3a3' })}
    >
      🖍️
    </button>
  );
}
function TimestampButton(): JSX.Element {
  const cmd = useCommand();
  return (
    <button type="button" className="note-btn" title="Insert timestamp" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertTimestamp')}>
      🕒
    </button>
  );
}
const myPlugin = definePlugin({
  name: 'demo-extras',
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
  buttons: { highlight: HighlightButton, timestamp: TimestampButton },
});
function PluginEx(): JSX.Element {
  return (
    <div className="stack">
      <div className="note-tip">🔌 Two custom toolbar buttons: 🖍️ highlight (yellow) and 🕒 insert timestamp.</div>
      <EditorCard
        code={`const myPlugin = definePlugin({
  name: 'demo-extras',
  commands: { insertTimestamp: (core) => { /* … */ return true; } },
  buttons: { timestamp: () => { const cmd = useCommand(); return <button onClick={() => cmd('insertTimestamp')}>🕒</button>; } },
});
<SummernoteEditor plugins={[myPlugin]} toolbar={[['insert', ['highlight','timestamp']]]} />`}
      >
        <SummernoteEditor
          plugins={[myPlugin]}
          toolbar={[
            ['font', ['bold', 'italic']],
            ['insert', ['highlight', 'timestamp']],
          ]}
          defaultValue="<p>Select text, then try 🖍️ and 🕒.</p>"
        />
      </EditorCard>
    </div>
  );
}

function ImperativeRef(): JSX.Element {
  const ref = useRef<SummernoteEditorHandle>(null);
  const [out, setOut] = useState('');
  return (
    <div className="stack">
      <div className="card card-pad row">
        <button className="btn" onClick={() => ref.current?.focus()}>
          focus()
        </button>
        <button className="btn" onClick={() => ref.current?.command('bold')}>
          command(&apos;bold&apos;)
        </button>
        <button className="btn" onClick={() => ref.current?.undo()}>
          undo()
        </button>
        <button className="btn" onClick={() => ref.current?.redo()}>
          redo()
        </button>
        <button className="btn" onClick={() => ref.current?.setCode('<p>set via <b>ref</b></p>')}>
          setCode()
        </button>
        <button className="btn btn-accent" onClick={() => setOut(ref.current?.getCode() ?? '')}>
          getCode()
        </button>
      </div>
      <EditorCard
        code={`const ref = useRef<SummernoteEditorHandle>(null);
<SummernoteEditor ref={ref} defaultValue="<p>…</p>" />
// ref.current?.getCode() / setCode(html) / command(name) / focus() / undo() / redo()`}
      >
        <SummernoteEditor ref={ref} defaultValue="<p>Drive me with the buttons above.</p>" />
      </EditorCard>
      {out ? (
        <div className="card">
          <div className="label">getCode()</div>
          <pre className="output">{out}</pre>
        </div>
      ) : null}
    </div>
  );
}

function Placeholder(): JSX.Element {
  return (
    <EditorCard code={`<SummernoteEditor placeholder="Write something amazing…" />`}>
      <SummernoteEditor placeholder="Write something amazing…" defaultValue="<p><br></p>" />
    </EditorCard>
  );
}

function ImageUpload(): JSX.Element {
  const [html, setHtml] = useState('<p>Click the 🖼️ picture button and choose an image.</p>');
  const [useHook, setUseHook] = useState(true);
  // Stand-in for a real uploader: POST the file to your server / S3 and return the hosted URL.
  // Returning a Promise makes the editor show a spinner until it resolves; here we mint a local
  // object URL (a blob: URL, NOT base64) after a delay to mimic the round-trip.
  const fakeUpload = (file: File): Promise<string> =>
    new Promise((resolve) => window.setTimeout(() => resolve(URL.createObjectURL(file)), 1200));
  return (
    <div className="stack">
      <div className="note-tip">
        🖼️ Click the <b>picture</b> button → choose a file. With <code>onImageUpload</code> a spinner shows while your
        uploader runs, then the returned <b>URL</b> is inserted; without it, the file is embedded as a base64 data URL.
      </div>
      <div className="card card-pad row">
        <label className="switch">
          <input type="checkbox" checked={useHook} onChange={(e) => setUseHook(e.target.checked)} />
          use <code>onImageUpload</code> (insert a URL, not base64)
        </label>
      </div>
      <EditorCard
        code={`<SummernoteEditor
  onImageUpload={async (file) => {
    const url = await uploadToServer(file); // your API
    return url;                             // (or a base64 string) — a spinner shows until this resolves
  }}
/>`}
      >
        <SummernoteEditor value={html} onChange={setHtml} {...(useHook ? { onImageUpload: fakeUpload } : {})} />
      </EditorCard>
      <div className="card">
        <div className="label">resulting HTML (note the img src)</div>
        <pre className="output">{html.length > 400 ? html.slice(0, 400) + ' …(truncated)' : html}</pre>
      </div>
    </div>
  );
}

export const EXAMPLES: Example[] = [
  { id: 'basic', emoji: '✏️', title: 'Basic', group: 'Getting started', blurb: 'A default editor — the full toolbar wired to the own-command engine.', Component: Basic },
  { id: 'controlled', emoji: '🔁', title: 'Controlled value', group: 'Getting started', blurb: 'Controlled value / onChange with a live HTML view. React owns the value; the engine owns the caret.', Component: Controlled },
  { id: 'placeholder', emoji: '💬', title: 'Placeholder', group: 'Getting started', blurb: 'A placeholder shown over an empty editable.', Component: Placeholder },
  { id: 'air-mode', emoji: '✈️', title: 'Air mode', group: 'Features', blurb: 'No fixed toolbar — a floating toolbar appears at the selection (below it on touch).', Component: AirModeEx },
  { id: 'themes', emoji: '🎨', title: 'Themes', group: 'Features', blurb: 'lite / bs3 / bs4 / bs5 as CSS skins. Per-instance — editors with different themes coexist.', Component: Themes },
  { id: 'localization', emoji: '🌐', title: 'Localization', group: 'Features', blurb: '46 bundled locales, deep-merged over en-US. Pass one via the lang prop.', Component: Localization },
  { id: 'insert-image', emoji: '🖼️', title: 'Image upload', group: 'Features', blurb: 'onImageUpload hook: send picked files to your uploader and insert the returned URL — or fall back to base64.', Component: ImageUpload },
  { id: 'multiple-editors', emoji: '🧩', title: 'Multiple editors', group: 'Recipes', blurb: 'Several independent editors on one page, each with its own theme and state.', Component: Multiple },
  { id: 'click-to-edit', emoji: '👆', title: 'Click to edit', group: 'Recipes', blurb: 'Show rendered content; swap to the editor on Edit, back to the view on Save.', Component: ClickToEdit },
  { id: 'custom-toolbar', emoji: '🧰', title: 'Custom toolbar', group: 'Recipes', blurb: 'The toolbar is just a [group, names][] config — trim it down or build your own.', Component: CustomToolbar },
  { id: 'custom-plugin', emoji: '🔌', title: 'Custom button / plugin', group: 'Recipes', blurb: 'definePlugin adds per-instance commands + custom toolbar buttons (here: highlight + timestamp).', Component: PluginEx },
  { id: 'imperative-ref', emoji: '🎛️', title: 'Imperative API', group: 'Recipes', blurb: 'A ref exposes getCode / setCode / command / focus / undo / redo.', Component: ImperativeRef },
];

// Korean title/blurb overrides, keyed by example id (the demo code inside each card stays English).
export const EXAMPLE_KO: Record<string, { title: string; blurb: string }> = {
  basic: { title: '기본', blurb: '기본 에디터 — 전체 툴바가 자체 명령 엔진에 연결되어 있습니다.' },
  controlled: { title: 'Controlled 값', blurb: 'value / onChange로 제어하며 HTML을 실시간 표시. React가 값을, 엔진이 커서를 소유합니다.' },
  placeholder: { title: '플레이스홀더', blurb: '비어 있는 editable 위에 표시되는 플레이스홀더.' },
  'air-mode': { title: '에어 모드', blurb: '고정 툴바 없음 — 선택 위치에 떠 있는 툴바가 나타납니다(터치에서는 아래).' },
  themes: { title: '테마', blurb: 'lite / bs3 / bs4 / bs5를 CSS 스킨으로. 인스턴스별 — 서로 다른 테마가 공존합니다.' },
  localization: { title: '현지화', blurb: '46개 번들 로케일, en-US 위에 deep-merge. lang prop으로 전달합니다.' },
  'insert-image': { title: '이미지 업로드', blurb: 'onImageUpload 훅: 선택한 파일을 업로더로 보내고 반환된 URL을 삽입 — 또는 base64로 폴백.' },
  'multiple-editors': { title: '다중 에디터', blurb: '한 페이지에 독립적인 여러 에디터, 각자 테마와 상태를 가집니다.' },
  'click-to-edit': { title: '클릭하여 편집', blurb: '렌더된 콘텐츠를 보여주다가 편집 시 에디터로, 저장 시 다시 뷰로 전환합니다.' },
  'custom-toolbar': { title: '커스텀 툴바', blurb: '툴바는 [group, names][] 설정일 뿐 — 줄이거나 직접 구성합니다.' },
  'custom-plugin': { title: '커스텀 버튼 / 플러그인', blurb: 'definePlugin으로 인스턴스별 명령 + 커스텀 툴바 버튼 추가(여기서는 형광펜 + 타임스탬프).' },
  'imperative-ref': { title: '명령형 API', blurb: 'ref로 getCode / setCode / command / focus / undo / redo 노출.' },
};
