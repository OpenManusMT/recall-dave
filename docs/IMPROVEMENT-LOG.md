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
