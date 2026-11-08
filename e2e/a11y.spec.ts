import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DAY0, openApp, skipOnboarding } from './helpers';

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const summary = serious.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(', ')}`,
  );
  expect(summary, `${label}: serious/critical accessibility violations`).toEqual([]);
  return results.violations.length;
}

for (const theme of ['light', 'dark'] as const) {
  test(`axe: critical screens have no serious or critical violations (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await openApp(page);
    await audit(page, 'welcome');
    await skipOnboarding(page);
    await audit(page, 'home');
    for (const hash of ['#/library', '#/add', '#/reviews', '#/insights', '#/settings']) {
      await openApp(page, DAY0, hash);
      await expect(page.locator('main h1').first()).toBeVisible();
      await audit(page, hash);
    }
    // Reading → recall → question → check steps.
    await openApp(page, DAY0, '#/read/p02-canal-locks');
    await expect(page.getByRole('heading', { name: 'Read this part, then hide it' })).toBeVisible();
    await page.getByRole('button', { name: 'Explain this part' }).click();
    await audit(page, 'reading');
    await page.getByRole('button', { name: /I’ve read it/ }).click();
    await audit(page, 'recall');
    await page.getByLabel('Your words').fill('Locks raise boats');
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await audit(page, 'question');
    await page.getByRole('radio').first().click();
    await audit(page, 'question answered');
    await page.getByRole('button', { name: 'Continue' }).click();
    await audit(page, 'check');
    await page.getByRole('button', { name: /give me a hint/ }).click();
    await audit(page, 'hint');
  });
}

test('axe: high-contrast mode', async ({ page }) => {
  await openApp(page);
  await skipOnboarding(page);
  await openApp(page, DAY0, '#/settings');
  await page.getByLabel('High contrast').check();
  for (const hash of ['#/', '#/read/p03-robins-in-winter', '#/settings']) {
    await openApp(page, DAY0, hash);
    await expect(page.locator('main h1').first()).toBeVisible();
    await audit(page, `high contrast ${hash}`);
  }
});
