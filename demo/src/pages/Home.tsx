import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SummernoteEditor, locales } from '@eaeao/summernote-react';
import { useLocale } from '../components/useLocale';
import { t } from '../components/ui-strings';
import { localePath } from '../lib/docs';

export function Home(): JSX.Element {
  const locale = useLocale();
  const s = t(locale);
  const h = s.home;
  const [html, setHtml] = useState(h.demoHtml);

  return (
    <div className="home">
      <header className="hero">
        <h1 className="hero-title">
          {h.heroPre}
          <span className="grad">{h.heroAccent}</span>
          {h.heroPost}
        </h1>
        <p className="hero-tag">{h.heroTag}</p>
        <div className="hero-actions">
          <span className="pill">npm i @eaeao/summernote-react</span>
          <Link className="btn btn-accent" to={localePath('/docs', locale)}>
            {h.readDocs}
          </Link>
          <Link className="btn" to={localePath('/playground', locale)}>
            {s.playground}
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
            <SummernoteEditor value={html} onChange={setHtml} {...(locale === 'ko' ? { lang: locales['ko-KR'] } : {})} />
          </div>
        </div>
      </section>

      <section className="home-features">
        {h.features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-emoji">{f.emoji}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-body">{f.body}</div>
          </div>
        ))}
      </section>

      <section className="home-cta card">
        <div>
          <div className="home-cta-title">{h.ctaTitle}</div>
          <div className="home-cta-sub">{h.ctaSub}</div>
        </div>
        <Link className="btn btn-accent" to={localePath('/docs/getting-started', locale)}>
          {h.ctaButton}
        </Link>
      </section>

      <footer className="foot">
        MIT · a port of <a href="https://summernote.org">summernote</a> · <code>@eaeao/summernote-react</code>
      </footer>
    </div>
  );
}
