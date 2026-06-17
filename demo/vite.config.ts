import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const fromRoot = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// the demo imports the editor SOURCE directly (no build step) — alias the package + its @engine.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@eaeao/summernote-react': fromRoot('../src/index.ts'),
      '@engine': fromRoot('../src/engine/index.ts'),
    },
  },
});
