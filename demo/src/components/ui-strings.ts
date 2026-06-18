import type { Locale } from '../lib/docs';

export interface Feature {
  emoji: string;
  title: string;
  body: string;
}

export interface UiStrings {
  // top nav + docs chrome
  docs: string;
  playground: string;
  documentation: string;
  onThisPage: string;
  previous: string;
  next: string;
  fallbackBanner: string;
  /** Sidebar group labels, keyed by the English section name in DOC_ORDER. */
  sections: Record<string, string>;
  // home (landing) page
  home: {
    heroPre: string;
    heroAccent: string;
    heroPost: string;
    heroTag: string;
    readDocs: string;
    ctaTitle: string;
    ctaSub: string;
    ctaButton: string;
    demoHtml: string;
    features: Feature[];
  };
  // playground page
  pg: {
    titlePre: string;
    titlePost: string;
    tag: string;
    examplesHeading: string;
    code: string;
    copy: string;
    copied: string;
    /** Example group labels, keyed by the English group name. */
    groups: Record<string, string>;
  };
}

// Site chrome strings (NOT the doc content — that lives in the .md files). Keyed by locale.
export const UI: Record<Locale, UiStrings> = {
  en: {
    docs: 'Docs',
    playground: 'Playground',
    documentation: 'Documentation',
    onThisPage: 'On this page',
    previous: 'Previous',
    next: 'Next',
    fallbackBanner: 'This page has not been translated yet — showing the English version.',
    sections: { Tutorial: 'Tutorial', 'How-to': 'How-to', Reference: 'Reference', Explanation: 'Explanation' },
    home: {
      heroPre: 'React summernote, ',
      heroAccent: 'reimagined',
      heroPost: '.',
      heroTag:
        "A TypeScript port on summernote's own engine — zero runtime deps, no jQuery. The editor engine and the React bindings ship in one package.",
      readDocs: 'Read the docs →',
      ctaTitle: 'Get started in two imports.',
      ctaSub: 'npm i @eaeao/summernote-react · import the component + the CSS, render it. That’s the whole contract.',
      ctaButton: 'Getting started →',
      demoHtml: '<p>Hello <b>summernote-react</b> 👋</p><p>This is a real editor — try the toolbar.</p>',
      features: [
        { emoji: '🚫', title: 'No jQuery, own engine', body: 'The engine computes editor state structurally from the caret’s ancestor chain and edits via its own Range commands.' },
        { emoji: '📦', title: 'Zero runtime deps', body: 'Only react / react-dom (>=18) as peers; the editing engine is bundled in — ESM + CJS + .d.ts.' },
        { emoji: '🎨', title: 'Per-instance themes', body: 'theme="lite | bs3 | bs4 | bs5" plus the matching CSS — editors with different themes coexist on one page.' },
        { emoji: '🌐', title: '46 bundled locales', body: "import { locales } and pass lang={locales['ko-KR']}; missing keys fall back to en-US." },
        { emoji: '🖼️', title: 'Pluggable image upload', body: 'onImageUpload={(file) => string | Promise<string>} swaps the base64 embed for your own hosted src.' },
        { emoji: '🧩', title: 'Plugins & headless', body: 'definePlugin({ commands, buttons }) per instance, or drive a controlled editor caret-safe with no chrome.' },
      ],
    },
    pg: {
      titlePre: 'Playground ',
      titlePost: ' live examples',
      tag: 'Every recipe below is a real <SummernoteEditor> running on the source engine — edit any of them right here. Copy the snippet under each card.',
      examplesHeading: '📑 Examples',
      code: 'code',
      copy: 'copy',
      copied: '✓ copied',
      groups: { 'Getting started': 'Getting started', Features: 'Features', Recipes: 'Recipes' },
    },
  },
  ko: {
    docs: '문서',
    playground: '플레이그라운드',
    documentation: '문서',
    onThisPage: '이 페이지 목차',
    previous: '이전',
    next: '다음',
    fallbackBanner: '이 페이지는 아직 번역되지 않아 영문으로 표시됩니다.',
    sections: { Tutorial: '튜토리얼', 'How-to': '사용법', Reference: '레퍼런스', Explanation: '설명' },
    home: {
      heroPre: 'React summernote, ',
      heroAccent: '재해석',
      heroPost: '.',
      heroTag:
        'summernote 자체 엔진 위에 올린 TypeScript 포트 — 런타임 의존성 0, jQuery 없음. 편집 엔진과 React 바인딩이 한 패키지에 들어 있습니다.',
      readDocs: '문서 보기 →',
      ctaTitle: '두 번의 import로 시작하세요.',
      ctaSub: 'npm i @eaeao/summernote-react · 컴포넌트 + CSS를 import하고 렌더하면 끝입니다. 그게 전체 계약입니다.',
      ctaButton: '시작하기 →',
      demoHtml: '<p>안녕하세요 <b>summernote-react</b> 👋</p><p>진짜 에디터입니다 — 위 툴바를 사용해 보세요.</p>',
      features: [
        { emoji: '🚫', title: 'jQuery 없음, 자체 엔진', body: '엔진이 커서의 조상 체인을 따라 구조적으로 상태를 계산하고, 자체 Range 명령으로 편집합니다.' },
        { emoji: '📦', title: '런타임 의존성 0', body: 'react / react-dom(>=18) peer만; 편집 엔진은 번들에 포함 — ESM + CJS + .d.ts.' },
        { emoji: '🎨', title: '인스턴스별 테마', body: 'theme="lite | bs3 | bs4 | bs5" + 맞는 CSS — 서로 다른 테마의 에디터가 한 페이지에 공존합니다.' },
        { emoji: '🌐', title: '46개 번들 로케일', body: "import { locales } 후 lang={locales['ko-KR']}; 누락된 키는 en-US로 폴백됩니다." },
        { emoji: '🖼️', title: '교체 가능한 이미지 업로드', body: 'onImageUpload={(file) => string | Promise<string>}로 base64 임베드를 자체 호스팅 src로 교체합니다.' },
        { emoji: '🧩', title: '플러그인 & 헤드리스', body: 'definePlugin({ commands, buttons })로 인스턴스별 확장, 또는 크롬 없이 controlled 에디터를 커서 안전하게 제어합니다.' },
      ],
    },
    pg: {
      titlePre: '플레이그라운드 ',
      titlePost: ' 라이브 예제',
      tag: '아래 모든 레시피는 소스 엔진 위에서 동작하는 진짜 <SummernoteEditor>입니다 — 바로 여기서 편집해 보세요. 각 카드 아래 스니펫을 복사할 수 있습니다.',
      examplesHeading: '📑 예제',
      code: '코드',
      copy: '복사',
      copied: '✓ 복사됨',
      groups: { 'Getting started': '시작하기', Features: '기능', Recipes: '레시피' },
    },
  },
};

export const t = (locale: Locale): UiStrings => UI[locale];
