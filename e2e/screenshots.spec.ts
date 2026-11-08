import { test, type Page } from '@playwright/test';
import { DAY0, DAY1, doChunk, openApp, skipOnboarding } from './helpers';

/**
 * Documentation screenshots. Run with: RECALL_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts --project=chromium-390x844
 * These are Chromium browser screenshots at an iPhone-sized viewport — NOT physical-device screenshots.
 */
test.skip(
  !process.env.RECALL_SCREENSHOTS,
  'set RECALL_SCREENSHOTS=1 to regenerate docs/screenshots',
);
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });

test('capture key states', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await shot(page, '01-welcome');
  await skipOnboarding(page);
  await shot(page, '02-home-first-run');
  await page.getByRole('link', { name: 'Read', exact: true }).click();
  await shot(page, '03-library');
  await openApp(page, DAY0, '#/read/p01-bread');
  await shot(page, '04-reading');
  await page.getByRole('button', { name: 'Explain this part' }).click();
  await page.getByRole('heading', { name: 'Main points' }).scrollIntoViewIfNeeded();
  await shot(page, '05-explain-main-points');
  await page.getByRole('button', { name: /I’ve read it/ }).click();
  await page
    .getByLabel('Your words')
    .fill('Yeast eats the sugar in the flour and gives off gas, which makes bubbles.');
  await shot(page, '06-recall');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await page.getByTestId('answer-option').first().click();
  await shot(page, '07-question');
  await page.getByRole('button', { name: 'Continue' }).click();
  await shot(page, '08-check-point-structural-cue');
  await page.getByRole('button', { name: 'Yes, I wrote about it' }).click();
  await shot(page, '09-check-verify');
  await page.getByRole('button', { name: 'Yes, it matches' }).click();
  await page.getByRole('button', { name: 'Next point' }).click();
  await page.getByRole('button', { name: /give me a hint/ }).click();
  await page.getByRole('button', { name: 'Another hint' }).click();
  await shot(page, '10-cloze-hint');
  await page.getByRole('button', { name: /I remember it now/ }).click();
  await page.getByRole('button', { name: 'Yes, it matches' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await shot(page, '11-part-done');
  await page.getByRole('button', { name: 'Next part' }).click();
  await doChunk(page, 'Kneading builds gluten which traps the gas.', ['own', 'sentence']);
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await shot(page, '12-session-finished');
  await openApp(page, DAY1, '#/');
  await shot(page, '13-home-reviews-due');
  await openApp(page, DAY1, '#/reviews/run');
  await shot(page, '14-review-retrieval-first');
  await openApp(page, DAY1, '#/insights');
  await shot(page, '15-progress');
  await openApp(page, DAY1, '#/settings');
  await shot(page, '16-settings');
  await page.getByRole('heading', { name: 'Privacy and your data' }).scrollIntoViewIfNeeded();
  await shot(page, '17-privacy-and-data');
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page, DAY1, '#/read/p10-lighthouses');
  await shot(page, '18-reading-dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page, DAY1, '#/add');
  await shot(page, '19-paste-reading');
});
