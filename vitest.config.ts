import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const fromRoot = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // the engine is internal to this single package; tests + chrome import it via @engine
      '@engine': fromRoot('./src/engine/index.ts'),
      // self-import alias (so a test/example can import the package by name -> local source)
      '@eaeao/summernote-react': fromRoot('./src/index.ts'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.{ts,tsx}'],
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      // Multi-engine gate: every spec must pass on BOTH Chromium and WebKit (Safari engine).
      instances: [{ browser: 'chromium' }, { browser: 'webkit' }],
    },
  },
});
