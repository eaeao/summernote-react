import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Alias the workspace packages to their TS SOURCE so the browser-mode suite runs
// against src (not built dist) — the migration is test-gated against live source.
const fromRoot = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@summernote/core': fromRoot('./packages/core/src/index.ts'),
      '@summernote/react': fromRoot('./packages/react/src/index.ts'),
    },
  },
  test: {
    globals: true,
    // Only the ported TS specs run here; legacy test/base/**/*.spec.js (jQuery) are the
    // golden-corpus extraction source, not run by this config.
    include: ['packages/**/test/**/*.spec.ts', 'test/**/*.spec.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      // Multi-engine gate: every spec must pass on BOTH Chromium and WebKit (Safari engine).
      instances: [{ browser: 'chromium' }, { browser: 'webkit' }],
    },
  },
});
