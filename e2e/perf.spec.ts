import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { openApp, skipOnboarding } from './helpers';

// Measurement from improvement pass 3. Records numbers; the assertion is a generous regression guard.
test('startup time to first usable screen with 4× CPU throttling (cold, then warm via service worker)', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'chromium-390x844', 'measured once');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await openApp(page);
  await expect(page.getByRole('heading', { name: 'Welcome to Recall' })).toBeVisible();
  const cold = Date.now() - t0;
  await skipOnboarding(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  const t1 = Date.now();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recall', exact: true })).toBeVisible();
  const warm = Date.now() - t1;
  mkdirSync('docs/evidence', { recursive: true });
  writeFileSync(
    'docs/evidence/perf-startup.json',
    JSON.stringify(
      { cpuThrottle: 4, coldMs: cold, warmMs: warm, when: new Date().toISOString() },
      null,
      2,
    ) + '\n',
  );
  console.log(`cold ${cold} ms, warm ${warm} ms`);
  expect(warm).toBeLessThan(5000);
});
