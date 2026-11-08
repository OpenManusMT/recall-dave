import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * Generates dist/sw.js from src/sw-template.js with a precache list of every
 * emitted file and a content-hash cache version (deterministic per build).
 */
function serviceWorker(): Plugin {
  let outDir = '';
  return {
    name: 'recall-service-worker',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const files = walk(outDir)
        .map((p) => relative(outDir, p).split('\\').join('/'))
        .filter((f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'build-info.json')
        .sort();
      const h = createHash('sha256');
      for (const f of files) {
        h.update(f);
        h.update(readFileSync(join(outDir, f)));
      }
      const version = h.digest('hex').slice(0, 16);
      const precache = ['./', ...files.map((f) => `./${f}`)];
      const tpl = readFileSync(resolve(__dirname, 'src/sw-template.js'), 'utf8');
      const sw = tpl.replace('__CACHE_VERSION__', version).replace('__PRECACHE_LIST__', JSON.stringify(precache, null, 2));
      writeFileSync(join(outDir, 'sw.js'), sw);
      writeFileSync(
        join(outDir, 'build-info.json'),
        JSON.stringify({ app: 'Recall', version: pkg.version, cacheVersion: version, precacheCount: precache.length }, null, 2) + '\n',
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: ['safari15', 'chrome100', 'firefox100'],
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: { manualChunks: undefined },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
