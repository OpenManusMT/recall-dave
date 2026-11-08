import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { DAY0, doChunk, openApp, skipOnboarding } from './helpers';

// Regression tests from improvement pass 2 (reliability/safety). See docs/IMPROVEMENT-LOG.md.

test('R2: with no IndexedDB (e.g. some private modes) the app still works and says progress will not be kept', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => undefined, configurable: true });
  });
  await openApp(page);
  await skipOnboarding(page);
  await expect(page.getByText(/not letting Recall save anything/)).toBeVisible();
  await page.getByRole('button', { name: /Start a session/ }).click();
  await doChunk(page, 'yeast makes gas', ['own', 'own']);
});

test.describe('R9: iPhone Safari (not installed) gets Add to Home Screen guidance', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  test('hint shows once and can be dismissed for good', async ({ page }) => {
    await openApp(page);
    await skipOnboarding(page);
    await expect(
      page.getByRole('heading', { name: 'Add Recall to your Home Screen' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Recall', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Recall to your Home Screen' })).toHaveCount(
      0,
    );
  });
});

test('R14: a saved reading whose passage was removed in an app update can still be continued', async ({
  page,
}, testInfo) => {
  await openApp(page);
  await skipOnboarding(page);
  await openApp(page, DAY0, '#/read/p06-tides');
  await doChunk(page, 'the moon pulls the sea', ['own', 'own']);
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await openApp(page, DAY0, '#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  const path = testInfo.outputPath('b.json');
  await download.saveAs(path);
  const edited = readFileSync(path, 'utf-8').replaceAll('"p06-tides"', '"p99-retired-passage"');
  writeFileSync(path, edited);
  await page.getByTestId('import-file').setInputFiles(path);
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await openApp(page, DAY0, '#/read/p99-retired-passage');
  await expect(page.getByText(/Part 2 of \d/).first()).toBeVisible();
  await expect(page.locator('.reading-text').first()).not.toBeEmpty();
});
