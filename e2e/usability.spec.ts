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

// Improvement pass 3 (accessibility): radio groups follow the WAI-ARIA pattern.
test('A1: option groups are one Tab stop and arrow keys change the choice', async ({ page }) => {
  await openApp(page);
  await skipOnboarding(page);
  await openApp(page, DAY0, '#/settings');
  const group = page.getByRole('radiogroup', { name: 'Text size' });
  const selected = group.getByRole('radio', { checked: true });
  await selected.focus();
  await expect(selected).toHaveText('Large');
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio', { name: 'Larger' })).toBeFocused();
  await expect(group.getByRole('radio', { name: 'Larger' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('End');
  await expect(group.getByRole('radio', { name: 'Largest' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // Only the selected option is in the Tab order.
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('radiogroup', { name: 'Reading font' }).getByRole('radio', { checked: true }),
  ).toBeFocused();
});

test('A2: answer options are buttons, so arrow keys can never submit an answer by accident', async ({
  page,
}) => {
  await openApp(page);
  await skipOnboarding(page);
  await openApp(page, DAY0, '#/read/p05-garden-compost');
  await page.getByRole('button', { name: /I’ve read it/ }).click();
  await page.getByLabel('Your words').fill('greens and browns');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  const first = page.getByTestId('answer-option').first();
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Choose an answer to continue' })).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/That’s right|Not quite/)).toBeVisible();
});
