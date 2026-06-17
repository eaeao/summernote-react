import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const fromRoot = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// the demo imports the editor SOURCE directly (no build step) — alias the package + its @engine.
// `base` for a production build = the GitHub Pages project path (https://eaeao.github.io/summernote-react/);
// dev serves at '/'. Override at build time with `vite build --base=/your-repo/` if you fork/rename.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/summernote-react/' : '/',
  plugins: [react()],
  // the demo imports editor source (incl. font assets) from the repo root, one level above demo/.
  // allow Vite to serve files from there.
  server: {
    fs: {
      allow: [fromRoot('..')],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@eaeao/summernote-react': fromRoot('../src/index.ts'),
      '@engine': fromRoot('../src/engine/index.ts'),
    },
  },
}));
