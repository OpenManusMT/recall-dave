import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Bundles the candidate scorer into a single Node ESM file for the Python A001 adapter.
export default defineConfig({
  root: resolve(import.meta.dirname),
  logLevel: 'warn',
  build: {
    ssr: resolve(import.meta.dirname, 'scorer-cli.ts'),
    outDir: resolve(import.meta.dirname, '.build'),
    emptyOutDir: true,
    target: 'node20',
    rollupOptions: { output: { entryFileNames: 'scorer-cli.mjs', format: 'es' } },
  },
  ssr: { noExternal: true },
});
