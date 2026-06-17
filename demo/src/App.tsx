import { useEffect, useState } from 'react';
import { EXAMPLES, type Example } from './examples';

const GROUPS = EXAMPLES.reduce<Record<string, Example[]>>((acc, ex) => {
  (acc[ex.group] ||= []).push(ex);
  return acc;
}, {});

const isWide = (): boolean => typeof window !== 'undefined' && window.innerWidth >= 1040;

export function App(): JSX.Element {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(isWide);
  const [activeId, setActiveId] = useState(EXAMPLES[0].id);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  // scroll-spy: highlight the section currently in view in the bookmark menu
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-15% 0px -75% 0px' },
    );
    for (const ex of EXAMPLES) {
      const el = document.getElementById(ex.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const closeOnNarrow = (): void => {
    if (!isWide()) setOpen(false);
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-brand">
          <span className="brand-logo">✦</span>
          <div>
            <div className="brand-name">summernote&#8209;react</div>
            <div className="brand-sub">@eaeao · v1.0</div>
          </div>
        </div>
        <h1 className="hero-title">
          React summernote, <span className="grad">reimagined</span>.
        </h1>
        <p className="hero-tag">
          A TypeScript port on summernote&apos;s own engine — <b>zero runtime deps</b>, no jQuery, no{' '}
          <code>execCommand</code>. The editor engine and the React bindings in one package.
        </p>
        <div className="hero-actions">
          <span className="pill">npm i @eaeao/summernote-react</span>
          <a className="btn" href="https://www.npmjs.com/package/@eaeao/summernote-react" target="_blank" rel="noreferrer">
            npm ↗
          </a>
          <a className="btn" href="https://github.com/eaeao/summernote-react" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </header>

      <main className="sections">
        {EXAMPLES.map((ex) => (
          <section key={ex.id} id={ex.id} className="ex-section">
            <div className="ex-head">
              <h1>
                <a className="anchor" href={`#${ex.id}`} aria-label={`Link to ${ex.title}`}>
                  #
                </a>
                {ex.emoji} {ex.title}
              </h1>
              <p>{ex.blurb}</p>
            </div>
            <ex.Component />
          </section>
        ))}
      </main>

      <footer className="foot">
        MIT · a port of <a href="https://summernote.org">summernote</a> ·{' '}
        <code>@eaeao/summernote-react</code>
      </footer>

      {/* floating bookmark menu — fixed top-right, follows the scroll */}
      <nav className={`bookmark${open ? ' open' : ''}`}>
        <div className="bookmark-bar">
          <span className="bookmark-heading">📑 Examples</span>
          <button className="iconbtn sm" onClick={() => setDark((d) => !d)} title="Toggle light / dark" aria-label="Toggle theme">
            {dark ? '☀️' : '🌙'}
          </button>
          <button className="iconbtn sm" onClick={() => setOpen((o) => !o)} aria-label="Toggle examples menu">
            {open ? '×' : '≡'}
          </button>
        </div>
        {open ? (
          <div className="bookmark-list">
            {Object.entries(GROUPS).map(([group, items]) => (
              <div key={group}>
                <div className="bookmark-group">{group}</div>
                {items.map((ex) => (
                  <a
                    key={ex.id}
                    href={`#${ex.id}`}
                    className={`bookmark-link${ex.id === activeId ? ' active' : ''}`}
                    onClick={closeOnNarrow}
                  >
                    <span className="emoji">{ex.emoji}</span>
                    {ex.title}
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
