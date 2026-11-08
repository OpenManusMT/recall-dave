import { expect, test } from '@playwright/test';
import { DAY0, doChunk, openApp, skipOnboarding } from './helpers';

test.describe('installable, offline PWA (production build served locally)', () => {
  test('manifest, icons and iOS meta tags are correct', async ({ page, request }) => {
    await openApp(page);
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('./manifest.webmanifest');
    const res = await request.get('manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({
      short_name: 'Recall',
      display: 'standalone',
      start_url: './',
      scope: './',
      lang: 'en-GB',
    });
    const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(
      expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
    );
    for (const icon of [
      ...m.icons.map((i: { src: string }) => i.src),
      './icons/apple-touch-icon.png',
    ]) {
      const r = await request.get(icon.replace(/^\.\//, ''));
      expect(r.ok(), icon).toBe(true);
      expect(r.headers()['content-type']).toContain('image/png');
    }
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      './icons/apple-touch-icon.png',
    );
  });

  test('service worker precaches the whole build; the app then works fully offline with no outside requests', async ({
    page,
    context,
    request,
  }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://localhost:4173/')) external.push(r.url());
    });

    await openApp(page);
    await skipOnboarding(page);
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toBe('http://localhost:4173/');
    const info = await (await request.get('build-info.json')).json();
    // Wait for install to finish populating the cache.
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const keys = await caches.keys();
          const c = keys.find((k) => k.startsWith('recall-'));
          return c ? (await (await caches.open(c)).keys()).length : 0;
        }),
      )
      .toBeGreaterThanOrEqual(info.precacheCount);

    // Make sure the page is controlled by the service worker, then cut the network.
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);

    await page.goto(`./?now=${encodeURIComponent(DAY0)}#/`);
    await expect(page.getByRole('heading', { name: 'Recall', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Read', exact: true }).click();
    await page
      .getByRole('link', { name: /lighthouse/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Read this part, then hide it' })).toBeVisible();
    await doChunk(page, 'Each lighthouse has its own pattern of light', ['own', 'hint']);
    await page.getByRole('button', { name: 'Finish for now' }).click();
    await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();

    // Restart while still offline: progress is still there.
    await page.reload();
    await page.goto(`./?now=${encodeURIComponent(DAY0)}#/insights`);
    await expect(page.getByRole('row', { name: /Parts read/ })).toContainText('1');
    await context.setOffline(false);

    expect(external, 'no requests may leave the app').toEqual([]);
  });

  test('every bundled passage opens offline after the first load', async ({ page, context }) => {
    await openApp(page);
    await skipOnboarding(page);
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);
    await page.goto(`./?now=${encodeURIComponent(DAY0)}#/library`);
    const links = page.locator('a.list-item[href^="#/read/"]');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(20);
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    for (const h of hrefs) {
      await page.goto(`./?now=${encodeURIComponent(DAY0)}${h}`);
      await expect(page.locator('.reading-text').first()).toBeVisible();
      await expect(page.locator('.reading-text').first()).not.toBeEmpty();
    }
    await context.setOffline(false);
  });
});
