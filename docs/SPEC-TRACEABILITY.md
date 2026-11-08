# Specification traceability

Sources: the original pack `spec-source/Read-Remember-Codex-Pack-v0.2/` (all 32 files verified against `SHA256SUMS.txt` and `MANIFEST.json`; the A001 harness is untouched and re-checked by `tests/a001/test_adapter.py` on every run) and the master build prompt `spec-source/handoff/Recall_Dave_Claude_Code_Cloud_Master_Build_Prompt.md` (newer, explicit decisions). Where they differ, the newer explicit decision is followed, unless that would weaken safety.

## Milestones A001–A010

| Milestone | Original exit criterion | Implementation | Status |
|---|---|---|---|
| A001 synthetic harness | Complete | Preserved byte-for-byte; baseline re-run before any change (`docs/evidence/a001-baseline/`): unit tests 7/7, oracle PASS, lexical baseline FAIL (reproduced identically). | PASS (as supplied) |
| A002 semantic scorer | A001 gate PASS, else scorer blocked | Deterministic local candidate (`packages/core/src/scorer.ts`) + A001 adapter (`tests/a001/`), 5 × 100 runs. **Gate FAIL** (A001 49% label+action, 105 safety failures; frozen holdout 62.5%, 25). The server-side provider interfaces with strict schemas exist in `services/api/`. | FAIL → scorer EXPERIMENTAL/DISABLED (as the spec requires) |
| A003 key ideas + grounding | Grounding/adversarial tests pass | Bundled passages: authored ideas with verbatim spans, qualifiers and relations, enforced by `validatePassage` (content test). Pasted text: verbatim key sentences (grounded by construction, labelled “not AI”). Server: grounding verifier rejects unsupported/qualifier-dropping ideas (pytest). | PASS (for implemented paths) |
| A004 chunker + clues | Deterministic tests pass | Semantic-unit chunker (sections merge/split only at boundaries that keep each idea whole, 40/80/180, max 3 ideas); pasted-text chunker; clue ladder 0–5 as a pure reducer. | PASS |
| A005 scheduler (shadow) | Shadow mode working | Transparent fixed steps are authoritative; FSRS-4.5-style D/S/R model computed and logged in shadow; proposed and actual dates both stored; same-day handling. | PASS (shadow only, by design) |
| A006 iPhone MVP + local persistence | Tests and web/manual checks | PWA (IndexedDB) complete with the 8 flows; Expo app (SQLite via the same core). | PASS for PWA in browsers; native see release report |
| A007 speech + confirmation | ASR safety tests | No in-app recording (no authorised transcription backend). Voice = iOS keyboard dictation into a visible, editable box, which is confirmation by design. Server enforces `asr_uncertain` → null score → `confirm_transcript`; candidate scorer does the same. | PARTIAL: voice capture via backend BLOCKED_EXTERNAL; typing/dictation path complete |
| A008 adversarial validation | Gates applicable to synthetic testing pass | Frozen holdout (40) + adversarial (18) sets written before the scorer; injection, negation, qualifier, numbers, names, empty, short, distractor, ASR cases. | Executed; candidate FAILS (recorded) |
| A009 EAS readiness | Cloud build ready; distribution BLOCKED_EXTERNAL if no credentials | `apps/mobile` app.json + eas.json profiles + Windows commands. | See `docs/RELEASE-REPORT.md` |
| A010 candidate pilot | Clean ZIP, execution state, pilot protocol, shadow scheduler | `release/recall-pwa-1.0.0.zip` + checksums; `docs/EXECUTION-STATE.md`; 10-minute test script; shadow scheduler. | BUILT_NOT_DEPLOYED, PHYSICAL_IPHONE_NOT_TESTED |

## Conscious differences from the original pack (and why)

1. **Web app shell is Vite + React, not Expo Web.** Expo Web cannot provide a reliable precaching service worker or IndexedDB-first offline storage on static hosting such as GitHub Pages: `expo-sqlite` on web needs cross-origin isolation headers that static hosts cannot set. Both apps use the same `@recall/core` and `@recall/content`, so no scoring, scheduling or chunking logic is duplicated (master prompt §3 explicitly allows this).
2. **No in-app microphone in this release.** Safe transcription needs an authorised backend and provider (none exists). iOS keyboard dictation gives voice input without a dead button, and shows the transcript for correction before checking.
3. **No automatic semantic marking in the app.** The candidate scorer failed the A001 gate, so the app uses transparent self-check against visible, source-backed points, plus objective multiple-choice questions (master prompt §4).
4. **Fresh-text probes are not added to reviews.** They are a separate dataset, used only to measure first-read performance. This keeps transfer measurement clean.
5. **Grade mapping:** clue level 4 (source sentence) maps to AGAIN, following 03-ADAPTIVE-ALGORITHM “fail/source reveal → AGAIN”. The starter reference mapped only level 5 to AGAIN.
6. **Holdout clue-level rubric is content-based** (partial/vague → 1, contradiction → 2, incorrect → 3), because A001’s clue levels for partial/wrong/contradiction cases follow source position, not content (`docs/evidence/a001/clue-level-artefact-analysis.txt`).

## A001 harness finding

For partial, wrong and contradiction cases, A001’s expected clue levels are a deterministic function of the source index:
- partial: 1 (odd source) or 2 (even source);
- wrong: 2 + ((index − 1) mod 4);
- contradiction: 2 (odd source) or 3 (even source).

A scorer that judges only the text can therefore reach at most 61.1% exact and 94.4% within ±1, both below the gate (80% / 95%). The thresholds were **not** changed and ids were **not** exploited. This is recorded so a future scorer team can raise it with the harness owner rather than “tune” to it.

## Master prompt requirements → where

| Requirement | Where |
|---|---|
| 20+ original edited passages, offline | `packages/content/src/passages/` (22) + `probes/` (6); `content.test.ts`; `pwa.spec.ts` opens all offline |
| Chunk target 80 / min 40 / max 180, ≤ 3 ideas, semantic boundaries | `packages/core/src/chunker.ts`, `text-chunker.test.ts` |
| Clue ladder 0–5, highest logged, no frustration loop | `ladder.ts`, `scheduler-ladder.test.ts`, `features.spec.ts` |
| Adaptation rules, one variable per session, user override, “Too much text” | `adaptation.ts`, `backup-adapt-progress.test.ts`, `features.spec.ts` |
| Shadow FSRS + transparent live schedule, both dates stored | `scheduler.ts`, `repo.ts` (`reviewLog`) |
| Progress: immediate / next-day / ~7-day / comprehension / clue dependence / chunk size / transfer, “Not measured yet” | `progress.ts`, `Insights.tsx` |
| Export / import / delete, migrations | `backup.ts`, `sqlite-store.ts`, `idb-store.ts`, tests |
| PWA: manifest, SW, icons, standalone, safe areas, offline | `apps/web`, `pwa.spec.ts` |
| Accessibility | `a11y.spec.ts`, `usability.spec.ts`, `features.spec.ts` (layout, keyboard, targets) |
| Provider interfaces, fake adapters, server-side keys | `services/api` |
| Single verify command | `npm run verify` → `docs/evidence/verify-latest.md` |
