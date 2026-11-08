// Renders the original SVG app icon to the PNG sizes needed by iOS and the web manifest.
// Usage: node scripts/make-icons.mjs   (needs Playwright's Chromium; output is committed)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconDir = resolve(root, 'apps/web/public/icons');
const targets = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['maskable.svg', 'icon-maskable-512.png', 512],
  ['maskable.svg', 'apple-touch-icon.png', 180],
  ['maskable.svg', '../../../mobile/assets/icon.png', 1024],
  ['maskable.svg', '../../../mobile/assets/splash-icon.png', 512],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of targets) {
  const svg = readFileSync(resolve(iconDir, src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({
    path: resolve(iconDir, out),
    omitBackground: out !== 'apple-touch-icon.png',
    clip: { x: 0, y: 0, width: size, height: size },
  });
  console.log('wrote', out);
}
await browser.close();
