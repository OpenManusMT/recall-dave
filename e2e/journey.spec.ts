import { expect, test } from '@playwright/test';
import { DAY0, DAY1, doChunk, openApp, skipOnboarding } from './helpers';

test('core journey: read → hide → recall → check → save → review next day → survives reload', async ({ page }) => {
  await openApp(page, DAY0);
  await skipOnboarding(page);

  // Nothing measured yet, no reviews.
  await expect(page.getByText('Nothing to review yet.')).toBeVisible();

  await page.getByRole('button', { name: /Start a session/ }).click();
  await expect(page.getByRole('heading', { name: 'Read this part, then hide it' })).toBeVisible();
  await expect(page.getByText(/Part 1 of \d+/).first()).toBeVisible();
  await doChunk(page, 'Yeast eats sugar in the flour and makes gas, bubbles make it grow.', ['own', 'hint']);
  await expect(page.getByText(/You’ll see them again tomorrow/)).toBeVisible();
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await expect(page.getByText(/You read 1 part/)).toBeVisible();

  // Reload the same day: progress persisted, nothing due yet.
  await page.reload();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.getByText(/Nothing due now. Next review tomorrow/)).toBeVisible();

  // Next day: the points are due, retrieval first.
  await openApp(page, DAY1, '#/');
  await expect(page.getByText(/2 points are ready to remember again/)).toBeVisible();
  await page.getByRole('link', { name: /Do reviews only/ }).click();
  await expect(page.getByRole('heading', { name: 'What do you remember from this part?' })).toBeVisible();
  // The source is hidden until asked for.
  await expect(page.getByText('Yeast is a tiny living fungus.', { exact: false })).toHaveCount(0);
  await page.getByLabel('Your words').fill('Yeast feeds on sugar and gives off carbon dioxide, which makes bubbles.');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  if (await page.getByRole('heading', { name: 'A quick question' }).isVisible().catch(() => false)) {
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByRole('button', { name: 'Yes, I wrote about it' }).click();
  await page.getByRole('button', { name: 'Yes, it matches' }).click();
  await page.getByRole('button', { name: 'Next point' }).click();
  await page.getByRole('button', { name: 'Yes, I wrote about it' }).click();
  await page.getByRole('button', { name: 'Yes, it matches' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: /Continue|Next review/ }).click();
  await expect(page.getByRole('heading', { name: 'Reviews done' })).toBeVisible();

  // Reload: the review was saved and nothing is due any more today.
  await page.reload();
  await openApp(page, DAY1, '#/reviews');
  await expect(page.getByText('Nothing is due right now.')).toBeVisible();
  await openApp(page, DAY1, '#/insights');
  await expect(page.getByText('Next-day recall')).toBeVisible();
});
