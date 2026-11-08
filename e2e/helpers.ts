import { expect, type Page } from '@playwright/test';

export const DAY0 = '2026-11-09T10:00:00';
export const DAY1 = '2026-11-10T10:00:00';

/** Open the app with a pinned clock (test-only `?now=` hook). */
export async function openApp(page: Page, now = DAY0, hash = '#/') {
  await page.goto(`./?now=${encodeURIComponent(now)}${hash}`);
}

export async function skipOnboarding(page: Page) {
  await expect(page.getByRole('heading', { name: 'Welcome to Recall' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip and start' }).click();
  await expect(page.getByRole('heading', { name: 'Recall', exact: true })).toBeVisible();
}

/**
 * Work through one chunk in "Help me remember" mode.
 * `plan` decides per point: 'own' (in my answer, matches), 'hint' (needs a hint then remembers), 'sentence' (needs the source).
 */
export async function doChunk(
  page: Page,
  recall: string,
  plan: ('own' | 'hint' | 'sentence')[] = ['own', 'own', 'own'],
) {
  await page.getByRole('button', { name: /I’ve read it/ }).click();
  await expect(page.getByRole('heading', { name: /What do you remember/ })).toBeVisible();
  await page.getByLabel('Your words').fill(recall);
  await page.getByRole('button', { name: /Check my answer|I can’t remember/ }).click();
  if (
    await page
      .getByRole('heading', { name: 'A quick question' })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  for (let k = 0; ; k++) {
    await expect(page.getByRole('heading', { name: /Check point \d+ of \d+/ })).toBeVisible();
    const how = plan[k] ?? 'own';
    if (how === 'own') {
      await page.getByRole('button', { name: 'Yes, I wrote about it' }).click();
      await page.getByRole('button', { name: 'Yes, it matches' }).click();
    } else if (how === 'hint') {
      await page.getByRole('button', { name: /give me a hint/ }).click();
      await page.getByRole('button', { name: /I remember it now/ }).click();
      await page.getByRole('button', { name: 'Yes, it matches' }).click();
    } else {
      await page.getByRole('button', { name: /give me a hint/ }).click();
      await page.getByRole('button', { name: 'Another hint' }).click();
      await page.getByRole('button', { name: 'Show me the sentence' }).click();
      await page.getByRole('button', { name: 'Got it' }).click();
    }
    const next = page.getByRole('button', { name: 'Next point' });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      continue;
    }
    await page.getByRole('button', { name: 'Save and continue' }).click();
    break;
  }
  await expect(page.getByRole('button', { name: /Finish (for now|session)/ })).toBeVisible();
}
