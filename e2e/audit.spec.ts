// Regression tests for defects found by the independent final audit (docs/IMPROVEMENT-LOG.md, F1–F15).
import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DAY0, DAY1, doChunk, openApp, skipOnboarding } from './helpers';

async function start(page: Page) {
  await openApp(page);
  await skipOnboarding(page);
}

async function failAllReviews(page: Page) {
  for (;;) {
    const heading = page.getByRole('heading', {
      name: /What do you remember|Reviews done|No reviews/,
    });
    await expect(heading).toBeVisible();
    if (/Reviews done|No reviews/.test(await heading.innerText())) return;
    await page.getByRole('button', { name: /I can’t remember/ }).click();
    if (await page.getByRole('heading', { name: 'A quick question' }).isVisible()) {
      await page.getByRole('button', { name: 'Skip this question' }).click();
    }
    for (;;) {
      await page.getByRole('button', { name: /give me a hint/ }).click();
      await page.getByRole('button', { name: 'Another hint' }).click();
      await page.getByRole('button', { name: 'Show me the sentence' }).click();
      await page.getByRole('button', { name: 'Got it' }).click();
      const next = page.getByRole('button', { name: 'Next point' });
      if (await next.isVisible()) {
        await next.click();
        continue;
      }
      await page.getByRole('button', { name: 'Save and continue' }).click();
      break;
    }
    await page.getByRole('button', { name: /Next review|Continue/ }).click();
  }
}

test('F1: the automatic part size changes once on new evidence and the screens show the stored value', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await start(page);
  await openApp(page, DAY0, '#/read/p01-bread');
  for (let k = 0; k < 3; k++) {
    await doChunk(page, 'something', ['own', 'own']);
    if (k < 2) await page.getByRole('button', { name: 'Next part' }).click();
  }
  await page.getByRole('button', { name: /Finish session/ }).click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await openApp(page, DAY1, '#/reviews/run');
  await failAllReviews(page);
  await page.getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  // New sessions: one decrease (80 → 68), then no further change without new evidence.
  for (const passage of ['p02-canal-locks', 'p03-robins-in-winter']) {
    await openApp(page, DAY1, `#/read/${passage}`);
    await expect(page.getByRole('heading', { name: 'Read this part, then hide it' })).toBeVisible();
    await openApp(page, DAY1, '#/settings');
    await expect(page.getByRole('radio', { name: 'Automatic (now 68 words)' })).toBeVisible();
    // Changing an unrelated setting must not write an old size back.
    await page.getByRole('radio', { name: 'Larger' }).click();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Automatic (now 68 words)' })).toBeVisible();
    await page.getByRole('radio', { name: 'Large', exact: true }).click();
  }
});

test('F3: reading a part in “Help me read” does not skip it in “Help me remember”', async ({
  page,
}) => {
  await start(page);
  await openApp(page, DAY0, '#/read/p06-tides?mode=read');
  await page.getByTestId('answer-option').first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await openApp(page, DAY0, '#/read/p06-tides');
  await expect(page.getByText(/Part 1 of \d/).first()).toBeVisible();
  await openApp(page, DAY0, '#/read/p06-tides?mode=read');
  await expect(page.getByText(/Part 2 of \d/).first()).toBeVisible();
});

test('F4: a typed review answer survives Pause, and “Start a session” continues a half-written answer', async ({
  page,
}) => {
  await start(page);
  await openApp(page, DAY0, '#/read/p01-bread');
  await doChunk(page, 'yeast', ['own', 'own']);
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await openApp(page, DAY1, '#/reviews/run');
  await page.getByLabel('Your words').fill('my half-written review answer');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Continue where you left off' }).click();
  await expect(page.getByLabel('Your words')).toHaveValue('my half-written review answer');

  // Half-written answer on a new passage, then “Start a session” from Home.
  await openApp(page, DAY1, '#/read/p02-canal-locks');
  await page.getByRole('button', { name: /I’ve read it/ }).click();
  await page.getByLabel('Your words').fill('locks and gates');
  await page.waitForTimeout(800);
  await openApp(page, DAY1, '#/');
  await page.getByRole('button', { name: /Start a session/ }).click();
  await expect(page.getByLabel('Your words')).toHaveValue('locks and gates');
});

test('F5: a double tap never answers the next step', async ({ page }) => {
  await start(page);
  await openApp(page, DAY0, '#/read/p01-bread');
  await page.getByRole('button', { name: /I’ve read it/ }).dblclick();
  await expect(page.getByRole('heading', { name: 'What do you remember?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show text' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.getByLabel('Your words').fill('yeast');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await page.getByRole('button', { name: 'Skip this question' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Check point 1 of 2' })).toBeVisible();
  await expect(page.getByText('Is this point in what you wrote?')).toBeVisible();
  await page.getByRole('button', { name: 'Yes, I wrote about it' }).dblclick();
  await expect(page.getByText('Does this match what you wrote?')).toBeVisible();
});

test('F6: with nothing written, “I wrote about it” is not offered', async ({ page }) => {
  await start(page);
  await openApp(page, DAY0, '#/read/p01-bread');
  await page.getByRole('button', { name: /I’ve read it/ }).click();
  await page.getByRole('button', { name: /I can’t remember/ }).click();
  await page.getByRole('button', { name: 'Skip this question' }).click();
  await expect(page.getByRole('button', { name: 'Yes, I wrote about it' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Partly' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /give me a hint/ })).toBeVisible();
});

test('F7: after one online visit the app opens and exports/imports with no network, even on hosts that send “Vary: Origin”', async ({
  page,
  context,
}) => {
  await start(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const k = (await caches.keys()).find((x) => x.startsWith('recall-'));
        return k ? (await (await caches.open(k)).keys()).length : 0;
      }),
    )
    .toBeGreaterThanOrEqual(12);
  await context.setOffline(true);
  const fresh = await context.newPage();
  await fresh.goto(`./?now=${encodeURIComponent(DAY0)}#/settings`);
  await expect(fresh.getByRole('heading', { name: 'Settings' })).toBeVisible();
  const [download] = await Promise.all([
    fresh.waitForEvent('download'),
    fresh.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  const path = join(mkdtempSync(join(tmpdir(), 'recall-')), 'offline-backup.json');
  await download.saveAs(path);
  await expect(fresh.getByText('Backup file saved to your downloads.')).toBeVisible();
  await fresh.getByTestId('import-file').setInputFiles(path);
  await expect(fresh.getByRole('heading', { name: 'Restore this backup?' })).toBeVisible();
  await context.setOffline(false);
});

test('F8: “Help me read” does not promise reviews', async ({ page }) => {
  await start(page);
  await openApp(page, DAY0, '#/read/p09-descaling-a-kettle?mode=read');
  await page.getByTestId('answer-option').first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page
    .getByRole('button', { name: /Finish/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await expect(page.getByText(/come back under Reviews/)).toHaveCount(0);
});

test('F10: with “Largest” text no word is split across lines in the tab bar', async ({ page }) => {
  await start(page);
  await openApp(page, DAY0, '#/settings');
  await page.getByRole('radio', { name: 'Largest' }).click();
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('.tabbar a span:not(.badge)')]
      .filter((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getClientRects().length > 1;
      })
      .map((el) => el.textContent),
  );
  expect(broken).toEqual([]);
});

test('F11/F12/F13: custom fixed size is shown; dialogs keep focus; counts read naturally', async ({
  page,
}) => {
  await start(page);
  await openApp(page, DAY0, '#/settings');
  await page.getByRole('radio', { name: 'Medium (about 80 words)' }).click();
  await openApp(page, DAY0, '#/read/p01-bread');
  await page.getByRole('button', { name: 'Too much text' }).click();
  await expect(page.getByRole('status').first()).toContainText(/shorter/);
  await openApp(page, DAY0, '#/settings');
  await expect(page.getByRole('radio', { name: /Your size \(about \d+ words\)/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Delete all data' }).click();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  const inDialog = await page.evaluate(() =>
    Boolean(document.activeElement?.closest('[role="dialog"]')),
  );
  expect(inDialog).toBe(true);
  await page.keyboard.press('Escape');
});

test('F15: Home shows how many checks a percentage is based on', async ({ page }) => {
  await start(page);
  await openApp(page, DAY0, '#/read/p01-bread');
  await doChunk(page, 'yeast', ['own', 'hint']);
  await page.getByRole('button', { name: 'Next part' }).click();
  await doChunk(page, 'gluten', ['own', 'own']);
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await openApp(page, DAY0, '#/');
  await expect(page.getByText(/· 4 checks/)).toBeVisible();
});
