import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SummernoteEditor } from '@eaeao/summernote-react';

interface Feature {
  emoji: string;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  { emoji: '🚫', title: 'No jQuery, own engine', body: 'The engine computes editor state structurally from the caret’s ancestor chain and edits via its own Range commands.' },
  { emoji: '📦', title: 'Zero runtime deps', body: 'Only react / react-dom (>=18) as peers; the editing engine is bundled in — ESM + CJS + .d.ts.' },
  { emoji: '🎨', title: 'Per-instance themes', body: 'theme="lite | bs3 | bs4 | bs5" plus the matching CSS — editors with different themes coexist on one page.' },
  { emoji: '🌐', title: '46 bundled locales', body: 'import { locales } and pass lang={locales[\'ko-KR\']}; missing keys fall back to en-US.' },
  { emoji: '🖼️', title: 'Pluggable image upload', body: 'onImageUpload={(file) => string | Promise<string>} swaps the base64 embed for your own hosted src.' },
  { emoji: '🧩', title: 'Plugins & headless', body: 'definePlugin({ commands, buttons }) per instance, or drive a controlled editor caret-safe with no chrome.' },
];

export function Home(): JSX.Element {
  const [html, setHtml] = useState('<p>Hello <b>summernote-react</b> 👋</p><p>This is a real editor — try the toolbar.</p>');

  return (
    <div className="home">
      <header className="hero">
        <h1 className="hero-title">
          React summernote, <span className="grad">reimagined</span>.
        </h1>
        <p className="hero-tag">
          A TypeScript port on summernote&apos;s own engine — <b>zero runtime deps</b>, no jQuery.
          The editor engine and the React bindings ship in one package.
        </p>
        <div className="hero-actions">
          <span className="pill">npm i @eaeao/summernote-react</span>
          <Link className="btn btn-accent" to="/docs">
            Read the docs →
          </Link>
          <Link className="btn" to="/playground">
            Playground
          </Link>
          <a className="btn" href="https://www.npmjs.com/package/@eaeao/summernote-react" target="_blank" rel="noreferrer">
            npm ↗
          </a>
          <a className="btn" href="https://github.com/eaeao/summernote-react" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </header>

      <section className="home-demo">
        <div className="card">
          <div className="editor-wrap">
            <SummernoteEditor value={html} onChange={setHtml} />
          </div>
        </div>
      </section>

      <section className="home-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-emoji">{f.emoji}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-body">{f.body}</div>
          </div>
        ))}
      </section>

      <section className="home-cta card">
        <div>
          <div className="home-cta-title">Get started in two imports.</div>
          <div className="home-cta-sub">
            <code>npm i @eaeao/summernote-react</code> · import the component + the CSS, render it. That’s the whole contract.
          </div>
        </div>
        <Link className="btn btn-accent" to="/docs/getting-started">
          Getting started →
        </Link>
      </section>

      <footer className="foot">
        MIT · a port of <a href="https://summernote.org">summernote</a> · <code>@eaeao/summernote-react</code>
      </footer>
    </div>
  );
}
