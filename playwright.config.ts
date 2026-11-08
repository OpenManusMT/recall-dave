import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';

/**
 * End-to-end tests for the PWA build (apps/web/dist served by `vite preview`).
 * Chromium with iPhone-sized viewports runs everywhere. WebKit runs only when a
 * Playwright WebKit build is installed (it is not in the cloud VM used to build
 * this release — see docs/EXECUTION-STATE.md). Browser tests are NOT proof of
 * behaviour on a physical iPhone.
 */
const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
const hasWebkit =
  process.env.RECALL_E2E_WEBKIT === '1' ||
  (browsersPath ? existsSync(browsersPath) && readdirSync(browsersPath).some((d) => d.startsWith('webkit')) : false);

const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } as const;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'off',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'npm run preview -w @recall/web',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium-375x667', use: { browserName: 'chromium', viewport: { width: 375, height: 667 }, ...mobile } },
    { name: 'chromium-390x844', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, ...mobile } },
    ...(hasWebkit
      ? [{ name: 'webkit-390x844', use: { browserName: 'webkit' as const, viewport: { width: 390, height: 844 }, ...mobile } }]
      : []),
  ],
});
