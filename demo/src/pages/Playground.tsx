import { useState } from 'react';
import { EXAMPLES, EXAMPLE_KO, type Example } from '../examples';
import { useScrollSpy } from '../components/useScrollSpy';
import { useLocale } from '../components/useLocale';
import { t } from '../components/ui-strings';

const GROUPS = EXAMPLES.reduce<Record<string, Example[]>>((acc, ex) => {
  (acc[ex.group] ||= []).push(ex);
  return acc;
}, {});

const isWide = (): boolean => typeof window !== 'undefined' && window.innerWidth >= 1040;

export function Playground(): JSX.Element {
  const locale = useLocale();
  const s = t(locale).pg;
  const [open, setOpen] = useState(isWide);
  const activeId = useScrollSpy(EXAMPLES.map((e) => e.id)) || EXAMPLES[0].id;

  const exTitle = (ex: Example): string => (locale === 'ko' && EXAMPLE_KO[ex.id] ? EXAMPLE_KO[ex.id].title : ex.title);
  const exBlurb = (ex: Example): string => (locale === 'ko' && EXAMPLE_KO[ex.id] ? EXAMPLE_KO[ex.id].blurb : ex.blurb);
  const groupLabel = (g: string): string => s.groups[g] ?? g;

  const closeOnNarrow = (): void => {
    if (!isWide()) setOpen(false);
  };

  return (
    <div className="page">
      <div className="page-col">
        <header className="pg-head">
          <h1 className="pg-title">
            {s.titlePre}
            <span className="grad">·</span>
            {s.titlePost}
          </h1>
          <p className="pg-tag">{s.tag}</p>
        </header>

        <main className="sections">
          {EXAMPLES.map((ex) => (
            <section key={ex.id} id={ex.id} className="ex-section">
              <div className="ex-head">
                <h1>
                  <a className="anchor" href={`#${ex.id}`} aria-label={`Link to ${ex.title}`}>
                    #
                  </a>
                  {ex.emoji} {exTitle(ex)}
                </h1>
                <p>{exBlurb(ex)}</p>
              </div>
              <ex.Component />
            </section>
          ))}
        </main>

        <footer className="foot">
          MIT · a port of <a href="https://summernote.org">summernote</a> · <code>@eaeao/summernote-react</code>
        </footer>
      </div>

      {/* bookmark rail — pinned to the right edge of .page, follows the scroll (sticky) */}
      <nav className={`bookmark${open ? ' open' : ''}`}>
        <div className="bookmark-bar">
          <span className="bookmark-heading">{s.examplesHeading}</span>
          <button className="iconbtn sm" onClick={() => setOpen((o) => !o)} aria-label="Toggle examples menu">
            {open ? '×' : '≡'}
          </button>
        </div>
        {open ? (
          <div className="bookmark-list">
            {Object.entries(GROUPS).map(([group, items]) => (
              <div key={group}>
                <div className="bookmark-group">{groupLabel(group)}</div>
                {items.map((ex) => (
                  <a
                    key={ex.id}
                    href={`#${ex.id}`}
                    className={`bookmark-link${ex.id === activeId ? ' active' : ''}`}
                    onClick={closeOnNarrow}
                  >
                    <span className="emoji">{ex.emoji}</span>
                    {exTitle(ex)}
                  </a>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
