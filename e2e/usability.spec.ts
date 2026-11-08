import { expect, test } from '@playwright/test';
import { DAY0, openApp, skipOnboarding } from './helpers';

// Regression tests from improvement pass 1 (usability). See docs/IMPROVEMENT-LOG.md.

test('U1: the main action stays on screen without scrolling, even with the largest text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page);
  await skipOnboarding(page);
  await openApp(page, DAY0, '#/settings');
  await page.getByRole('radio', { name: 'Largest' }).click();
  await openApp(page, DAY0, '#/read/p15-great-fire-of-london');
  const readBtn = page.getByRole('button', { name: /I’ve read it/ });
  await expect(readBtn).toBeInViewport();
  await readBtn.click();
  await expect(
    page.getByRole('button', { name: /I can’t remember|Check my answer/ }),
  ).toBeInViewport();
});

test('U2/U6: first-run Home is calm — no wall of “Not measured yet” cards', async ({ page }) => {
  await openApp(page);
  await skipOnboarding(page);
  await expect(
    page.getByText(/Your progress will appear here after your first reading/),
  ).toBeVisible();
  await expect(page.getByText('Not measured yet')).toHaveCount(0);
});

test('U3/U5: while checking, what you wrote is visible and the cue wording is plain', async ({
  page,
}) => {
  await openApp(page);
  await skipOnboarding(page);
  await openApp(page, DAY0, '#/read/p04-rainbows');
  await page.getByRole('button', { name: /I’ve read it/ }).click();
  await page.getByLabel('Your words').fill('The sun is behind you and light bends in raindrops');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await page.getByRole('button', { name: 'Skip this question' }).click();
  await expect(page.getByText('The sun is behind you and light bends in raindrops')).toBeVisible();
  await expect(page.locator('.cue-label')).toHaveText('About this point');
  await expect(
    page.getByRole('button', { name: 'I didn’t write it, but I remember it now' }),
  ).toBeVisible();
});
