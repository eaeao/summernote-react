// Docs are the single source of truth: read the same Markdown files committed under /docs.
// Vite inlines them as raw strings at build time (parent-dir glob is fine; dev server already
// allows the repo root via server.fs.allow). The glob also matches internal docs
// (CHROME-SPECS / STATUS / PORTING-PLAN) — DOC_ORDER is the explicit allowlist that decides
// which ones the site actually exposes, in sidebar / prev-next order.
const rawModules = import.meta.glob('../../../docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface DocMeta {
  slug: string;
  file: string;
  title: string;
  /** Diátaxis section for sidebar grouping; ungrouped (Overview) when omitted. */
  section?: string;
}

export const DOC_ORDER: DocMeta[] = [
  { slug: 'readme', file: 'README.md', title: 'Overview' },
  { slug: 'getting-started', file: 'getting-started.md', title: 'Getting started', section: 'Tutorial' },
  { slug: 'examples', file: 'examples.md', title: 'Examples', section: 'How-to' },
  { slug: 'reference-component', file: 'reference-component.md', title: 'Component & state', section: 'Reference' },
  { slug: 'reference-commands', file: 'reference-commands.md', title: 'Commands', section: 'Reference' },
  { slug: 'reference-options', file: 'reference-options.md', title: 'Options & toolbar', section: 'Reference' },
  { slug: 'reference-api', file: 'reference-api.md', title: 'Headless & plugin API', section: 'Reference' },
  { slug: 'concepts', file: 'concepts.md', title: 'How it works', section: 'Explanation' },
  { slug: 'migrating', file: 'migrating.md', title: 'Migrating from jQuery', section: 'Explanation' },
];

const rawByFile: Record<string, string> = {};
for (const [path, raw] of Object.entries(rawModules)) {
  const file = path.split('/').pop();
  if (file) rawByFile[file] = raw;
}

export function getDoc(slug: string): (DocMeta & { raw: string | undefined }) | null {
  const meta = DOC_ORDER.find((d) => d.slug === slug);
  if (!meta) return null;
  return { ...meta, raw: rawByFile[meta.file] };
}

export function prevNext(slug: string): { prev: DocMeta | null; next: DocMeta | null } {
  const i = DOC_ORDER.findIndex((d) => d.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: DOC_ORDER[i - 1] ?? null, next: DOC_ORDER[i + 1] ?? null };
}

// README is the docs landing (rendered at /docs); the rest live at /docs/<slug>.
export function slugToPath(slug: string): string {
  const s = slug.toLowerCase();
  return s === 'readme' ? '/docs' : `/docs/${s}`;
}
