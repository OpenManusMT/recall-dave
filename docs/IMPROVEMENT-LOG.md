# Improvement log

Each entry: **problem observed → reproduction/test → fix → test evidence → remaining limitation**. Every fix has a regression test. "Evidence" refers to the full regression run recorded in `docs/evidence/verify-latest.md` at the commit that closed the pass.

## Bugs found while building the automated suite (before the passes)

| # | Problem observed | Reproduction / test | Fix | Evidence | Remaining limitation |
|---|---|---|---|---|---|
| B1 | Settings toggles appeared not to respond: the checkbox flipped back until the save finished. | `e2e/features.spec.ts` › onboarding and settings (`locator.check` reported “did not change its state”). | `updateSettings` now applies changes optimistically, then saves; a failed save shows a message. | Test passes on 375×667 and 390×844. | — |
| B2 | “Too much text” notice vanished: re-planning created new chunk ids and remounted the reading flow. | `e2e/features.spec.ts` › “Too much text” makes parts shorter immediately. | Reading flow keyed by position; the re-planned chunk is always adopted with the right message. | Test passes. | If a part cannot be split without breaking an idea, only later parts get shorter (by design: meaning outranks word count). |
| B3 | After moving between screens, keyboard focus started from a stale position. | `e2e/features.spec.ts` › keyboard-only. | Focus moves to the main region on every screen change (also helps VoiceOver announce the new screen). | Test passes 10/10 repeats. | VoiceOver order on a physical iPhone still needs the manual checklist. |
| B4 | Literal invisible bidi characters inside a regular expression (hard to review, flagged by lint). | `eslint` › no-irregular-whitespace. | Replaced with explicit `\u` escapes. | Lint clean; unit tests pass. | — |

## Pass 1 — usability (adult first-time reader, low tolerance for clutter)

Method: walked the whole journey at 375×667 and 390×844 with “Large” and “Largest” text using the generated screenshots (`docs/screenshots/`), looking for dead ends, hidden actions, jargon and visual clutter.

| # | Problem observed | Reproduction / test | Fix | Evidence | Remaining limitation |
|---|---|---|---|---|---|
| U1 | The main action (“I’ve read it — hide the text”, and “Check my answer”) was below the fold with large text, so the next step was not discoverable without scrolling. | `e2e/usability.spec.ts` › U1 (Largest text, 375×667, longest passage). Failed before the fix. | Sticky action bar for the main action of reading and recall steps, respecting the safe area. A first attempt failed for the recall step (sticky element inside a short wrapper) — caught by the test and fixed. | U1 passes on both viewports. Screenshot `04-reading.png`. | With the on-screen keyboard open on iPhone the bar may sit under the keyboard; tapping “Done” reveals it. Needs the physical-device check. |
| U2 | Metric cards in two columns were cramped at large text sizes (3–4 line labels). | Visual review of `15-progress.png`. | Single column below 520 px. | Layout tests (no sideways scroll) pass at 320 px and rotated. | — |
| U6 | First-run Home showed four “Not measured yet” cards — clutter with no information. | `e2e/usability.spec.ts` › U2/U6. | First run shows one calm sentence; after the first reading a compact list replaces the cards. | Test passes. | — |
| U3 | “What you wrote” was collapsed while checking, so comparing needed an extra tap. | `e2e/usability.spec.ts` › U3/U5. | Open by default (can still be collapsed). | Test passes; screenshot `08-check-point-structural-cue.png`. | Very long answers make the check screen long; the action buttons remain below. |
| U4 | Cue label “Starting point” was unclear. | `e2e/usability.spec.ts` › U3/U5. | Renamed “About this point”. | Test passes. | — |
| U5 | “I remember it now — show me” on the first check step was ambiguous next to “Yes, I wrote about it”. | Same test. | Reworded to “I didn’t write it, but I remember it now” (this is the level-1 path of the clue ladder). | Test passes. | — |

## Pass 2 — reliability and safety

Method: attacked edge cases — interrupted and partial writes, unavailable or full storage, clock and time-zone changes, hostile or malformed input, app updates that change bundled content, and iPhone Safari behaviour (install state, storage eviction).

| # | Problem observed | Reproduction / test | Fix | Evidence | Remaining limitation |
|---|---|---|---|---|---|
| R3 | **Data-integrity bug:** in the IndexedDB store, a synchronous error part-way through a batch (e.g. an invalid record) did not abort the transaction, so earlier writes in the batch were committed — half a save. | `apps/web/src/lib/idb-store.test.ts` › applies a batch atomically (failed before the fix: the first record was stored). | All writes go through one helper that aborts the transaction on any error, synchronous or asynchronous; same for backup restore. | Test passes; full suite green. | — |
| R3c | After an aborted transaction, each individual write promise also rejected with nobody listening — an unhandled rejection that made the unit run fail intermittently. | Full `npm run verify` (unit step failed once). | Every per-request promise now has a handler; the transaction outcome is the single source of truth. | 5 consecutive unit runs: 106/106 each. | — |
| R3b | A full device produced a generic error. | Same file › reports a full device. | `QuotaExceededError` is classified and shown as “Your device is out of space for Recall. Please export a backup and free some space.” | Test passes. | Real quota behaviour on iOS needs the physical-device check. |
| R16 | Pasted text without full stops became one enormous part (a 3,000-word “sentence” would be a single chunk). | `packages/core/test/reliability.test.ts` › R16. | Over-long runs are split at commas/semicolons, else between words, never above the maximum. | Test passes. | Splits inside a run without punctuation may fall mid-thought. |
| R14 | If a future app update removed or renamed a bundled passage, an unfinished reading of it could not be opened (“could not be found”). | `e2e/reliability.spec.ts` › R14 (backup edited to a retired passage id, restored, then opened). | The saved copy of the reading is opened instead; chunks and points are snapshots, so history is unaffected. | Test passes. | — |
| R13 | A failed save (e.g. the reading was deleted in another tab) only offered “Try saving again”, which could never succeed — a dead end. | Code review of the save-error state. | Added “Go to Home” next to “Try saving again”. | Covered by the save-error UI; full suite green. | No automated reproduction of a cross-tab deletion. |
| R9 | People opening Recall in Safari were not told to install it, although Home Screen web apps work offline and keep their data more reliably than a browser tab. | `e2e/reliability.spec.ts` › R9 (iPhone user agent). | One-time, dismissible “Add Recall to your Home Screen” card on iPhone/iPad when not installed. | Test passes; dismissal survives reload. | Detection relies on the user agent / `navigator.standalone`. |
| R9b | No prompt to protect progress, although browsers can clear website data. | `packages/core/test/reliability.test.ts` › R9b. | “Keep a copy of your progress” card after 5 saved answers with no backup, or 30 days since the last; “Last backup” date shown in Settings. | Tests pass. | It cannot back up automatically (no account or server, by design). |
| R1 | Due dates around daylight-saving changes were untested. | `reliability.test.ts` › R1 (Europe/London, 25 Oct and 29 Mar 2026). | No code change needed: calendar arithmetic already lands on local midnight. Tests now guard it. | Tests pass. | Travelling across time zones shifts “today” by the time difference (stored instants are UTC). |
| R12 | Device clock moved backwards could have produced negative intervals. | `reliability.test.ts` › R12. | Already clamped to 0; now guarded by a test (no schedule advance). | Test passes. | — |
| R2 | Storage unavailable (some private-browsing modes). | `e2e/reliability.spec.ts` › R2. | Already fell back to memory with a clear banner; now guarded by an end-to-end test. | Test passes. | Nothing can be kept in that mode, by definition. |
| R4 | Oversized import files. | `reliability.test.ts` › R4. | Already rejected before parsing; now tested. | Test passes. | — |

Safety re-checks in this pass (no change needed, tests already exist): pasted text containing scripts, links and “ignore previous instructions” is shown as inert text and never executed or followed (`features.spec.ts`); no request leaves the device (`pwa.spec.ts`); the experimental scorer cannot be switched on from the UI and stays disabled; the advanced scheduler cannot change real review dates (`schedulerMode` is fixed to `shadow` by `normaliseSettings`).

## Pass 3 — performance and accessibility

Method: measured first (bundle composition, start-up under 4× CPU throttling, data-scale timings, every axe finding at all impact levels), then fixed only verified problems.

| # | Problem observed | Reproduction / measurement | Fix | Evidence | Remaining limitation |
|---|---|---|---|---|---|
| P1 | About 100 KB of the 548 KB start-up bundle was the schema validator, needed only to import a backup. | Bundle inspection of `apps/web/dist/assets`. | Backup export/import code loads on demand (`@recall/core/backup`); the service worker still precaches it, so import works offline. | Main bundle 548 KB → **454 KB** (gzip 158 KB → **132 KB**, −16%); lazy chunk 96 KB; precache 12 files; backup e2e tests pass. | The ~190 KB of bundled passages stays in the main bundle on purpose: everything must work offline from the first launch. |
| P2 | Unknown whether long-term use would slow the app. | `packages/core/test/scale.test.ts`: a year of daily use (1,095 parts, 2,190 points). | No change needed. | Insights ≈ 50 ms, due-review query ≈ 58 ms (desktop CPU); guarded at < 500 ms. | iPhone CPUs are slower; still expected well under a second. |
| P3 | Unknown start-up time on a slower device. | `e2e/perf.spec.ts` with 4× CPU throttling → `docs/evidence/perf-startup.json`. | No change needed. | Cold ≈ 395 ms, warm (service worker) ≈ 240 ms to first usable screen. | Not a physical-device measurement. |
| A1 | Option groups (text size, colours, reading mode, onboarding) used radio semantics without arrow-key support: every option was a separate Tab stop, unlike the standard pattern screen-reader and keyboard users expect. | `e2e/usability.spec.ts` › A1. | Shared `RadioGroup` component: one Tab stop (roving tabindex), arrow keys / Home / End move and select. | Test passes. | — |
| A2 | Multiple-choice answers were marked as radios, which implies arrow keys would move between them, and with radio semantics that would commit an answer. | `e2e/usability.spec.ts` › A2. | Answers are plain buttons in a labelled group (`aria-pressed`); arrow keys do nothing and an answer is only given by a deliberate tap/Enter. | Test passes. | — |
| A3 | Needed confirmation that no lower-impact axe issues remained. | One-off axe probe of Home, Library, Settings, Progress, reading and question steps. | No findings at any impact level. | `e2e/a11y.spec.ts` continues to gate serious/critical in light, dark and high-contrast. | Automated checks cannot judge VoiceOver reading order, or how clear the wording is for a real reader. See the manual checklist in `docs/IPHONE-INSTALL-AND-TEST.md`. |
