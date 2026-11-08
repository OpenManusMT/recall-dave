# Release report — Recall 1.0.0 (release candidate)

Date: 8 November 2026 · Branch: `claude/cool-allen-bu6jx0` · Commit: see “Final record” below.

Labels used, exactly as defined by the master brief:

| Label | Status | Why |
|---|---|---|
| `READY_FOR_DAVE_PWA_PILOT` | **Not claimed** | Needs an https deployment. Everything else on that checklist is evidenced (below). |
| `BUILT_NOT_DEPLOYED` | **Yes** | Production PWA built, tested and packaged; not hosted (publishing a public site needs the owner’s approval). |
| `DEPLOYMENT_BLOCKED_EXTERNAL` | Yes | One-click manual workflow and drag-and-drop ZIP provided (`docs/DEPLOYMENT.md`). |
| `PHYSICAL_IPHONE_NOT_TESTED` | Yes | 10-minute checklist ready (`docs/IPHONE-INSTALL-AND-TEST.md`). |
| `IOS_NATIVE_READY_FOR_SIGNING` | **Partly evidenced, not claimed in full** | Expo config evaluates, `eas.json` profiles exist, TypeScript, Jest and the iOS Metro bundle pass. `expo-doctor` could not complete 2 of 20 checks, because the Expo API is blocked from this VM. |
| `IOS_SIGNING_BLOCKED_EXTERNAL` | Yes | Needs Apple Developer Program membership (paid) and an Expo account. |
| `IOS_DEVICE_BUILD_VERIFIED` | **No** | No signed build exists; no device test. |
| Semantic scoring | **EXPERIMENTAL / DISABLED** | Candidate scorer failed the A001 gate (below). |
| Adaptive scheduler | **Shadow mode only** | Gate F (human-labelled validation) not met. |

## Completed (tested features and where they live)

- **Core** (`packages/core`):
  - semantic-boundary chunking (80/40/180 words, ≤ 3 ideas, ideas never split);
  - clue ladder 0–5 as a pure reducer;
  - transparent fixed-step schedule (authoritative) plus an FSRS-4.5-style model in shadow, with proposed and actual dates both logged;
  - adaptation on a rolling window of new parts, applied once per new evidence and once per session at most, with user override and “Too much text”;
  - insights with practised vs fresh probes separated and “Not measured yet”;
  - atomic, idempotent storage over IndexedDB, SQLite and memory;
  - backup v2 with v1 migration, strict validation and orphan dropping;
  - an experimental scorer (disabled).
- **Content** (`packages/content`): 22 original passages and 6 separate fresh-text probes. All pass the editorial validator (verbatim spans, preserved qualifiers, UK English, objective questions).
- **PWA** (`apps/web`):
  - Home, Read (library and paste your own), reading sessions in three modes (“Help me remember”, “Help me read”, fresh-text check), Reviews (retrieval first), Progress, Settings (comfort, answering, part size, privacy, export/import/delete-all);
  - offline service worker with a full precache, manifest, original icons, iOS meta tags and safe areas;
  - accessibility: focus management, WAI-ARIA radio groups, 44 px+ targets, high contrast, dark mode, reduce motion.
- **Native app** (`apps/mobile`): Expo SDK 58 / React Native 0.88. The same flows on the same core, with expo-sqlite storage and on-device speech.
- **Optional provider service** (`services/api`): FastAPI with Transcription, KeyIdea and RecallScoring interfaces and fake adapters. Remote adapters are disabled by default, and server-side safety rules apply (grounding, contradiction clamp, ASR confirmation, injection separation, log redaction).
- **A001 integration** (`tests/a001`): original harness untouched; frozen holdout and adversarial sets.
- **Docs**: README, CLAUDE.md, ARCHITECTURE, SPEC-TRACEABILITY, SECURITY-PRIVACY, DEPLOYMENT, IPHONE-INSTALL-AND-TEST, IMPROVEMENT-LOG, EXECUTION-STATE, CHANGELOG, LICENSE, HANDOFF-MARCO.

## Verified (commands and real results)

Full run: `npm run verify -- --full` → `docs/evidence/verify-latest.md` (copied below at release).

Run on commit `2b85799` (code identical to the release commit; later commits change only documentation, evidence and the rebuilt ZIP):

| Step | Status | Detail |
|---|---|---|
| npm ci (clean install from lockfile) | PASS | added 231 packages in 4s (3.6s) |
| Dependency audit (production deps, high+) | PASS | found 0 vulnerabilities |
| Format (prettier --check) | PASS | All matched files use Prettier code style! (2.3s) |
| Lint (eslint) | PASS | no problems (2.3s) |
| TypeScript (core, content, web) | PASS | no type errors (5.6s) |
| Unit tests (core, content, storage, backup, scheduler, scorer) | PASS | Tests  115 passed (115) (8.1s) |
| API tests (services/api, fake providers, no network) | PASS | 144 passed in 1.19s |
|   ↳ Candidate scorer production gate (A001) | FAIL (expected, recorded) | label+action 0.49, safety failures 105; holdout gate FAIL. Scorer stays DISABLED; scheduler stays shadow-only. |
| A001 harness integrity + candidate 5×100 runs | PASS | original unit tests, integrity, oracle, baseline and 5-run evaluations executed |
| PWA production build | PASS | apps/web/dist built (3.4s) |
| PWA build contents | PASS | precache 12 files, cache d1981640c7b6b19a, JS 541 KB |
| Playwright e2e + PWA offline + axe (Chromium 375×667, 390×844) | PASS | 87 passed, 3 skipped (screenshots) |
| Playwright WebKit (Safari engine) project | NOT_RUN | no Playwright WebKit build on this machine; run `npx playwright install webkit` then `npm run e2e` where permitted. WebKit ≠ iOS Safari. |
| Expo app TypeScript | PASS | no type errors (3.4s) |
| Expo config evaluates (expo config --type public) | PASS | config OK (0.4s) |
| Expo app unit tests (jest) | PASS | Time:        3.789 s, estimated 4 s / Ran all test suites. (4.2s) |
| Expo iOS JS bundle (expo export --platform ios) | PASS | Exported: dist-ios (11.9s) |
| EAS iOS build / signing / TestFlight | BLOCKED_EXTERNAL | IOS_SIGNING_BLOCKED_EXTERNAL: needs Expo account + Apple Developer membership |
| Physical iPhone test | BLOCKED_EXTERNAL | PHYSICAL_IPHONE_NOT_TESTED: see docs/IPHONE-INSTALL-AND-TEST.md |
| No secrets, recordings or databases in tracked files | PASS | 322 tracked files scanned |
| Built PWA makes no third-party requests and contains no keys | PASS | 13 built files scanned |

Result: **all executed verification steps passed** (exit code 0). Mobile Jest: 18/18 tests in 4 suites (see `apps/mobile/VERIFICATION.txt`).

Other evidence:
- **Fresh clone reproduction** (`git clone` → `npm ci` → unit tests → build) on this VM: build content hash identical to the working copy, and the release ZIP is byte-identical (SHA-256 below).
- **Browser scope:** Chromium (Playwright 1.63, build 1243) with iPhone-sized viewports 375×667 and 390×844, touch and mobile emulation. Also 320×640 and rotated 667×375 for layout; light, dark and high contrast; text size up to “Largest”; keyboard-only; offline after the first load. **WebKit was not run:** no Playwright WebKit build exists on this VM, and installing browsers is not permitted here. No result here is an iOS Safari result.
- **Native:** `apps/mobile/VERIFICATION.txt` covers `npm ci`, `tsc` (0 errors), Jest 18/18, `expo config` OK, `expo export --platform ios` (1,498 modules, Hermes bytecode; passage content present), and a fresh-copy reproduction. Independently re-run by the integrator: tsc OK, Jest 18/18, config OK, iOS export OK. `expo-doctor`: 18/20 passed; 2 could not run (Expo API host blocked) — **not a pass**.
- **Performance:** start-up with 4× CPU throttling about 395 ms cold and 240 ms warm (`docs/evidence/perf-startup.json`). A year of heavy use computes insights in about 50 ms and due reviews in about 58 ms. Main JS 454 KB (132 KB gzip); backup code is loaded on demand.

### A001 scoring gate (thresholds unchanged)

| Run | Gate | Label+action | Score in range | Clue exact | Clue ±1 | Worst category | Safety failures | Consistency |
|---|---|---|---|---|---|---|---|---|
| Original oracle (answer key — harness check only) | PASS | 100% | 100% | 100% | 100% | 100% | 0 | 100% |
| Original lexical baseline | FAIL | 24.0% | 30.0% | 26.7% | 67.8% | 0.0% | 200 | 100% |
| Candidate, A001 (development set, tuned on it) | **FAIL** | 49.0% | 60.0% | 37.8% | 75.6% | 20.0% | 105 | 100% |
| Candidate, frozen holdout (written before the scorer) | **FAIL** | 62.5% | 63.9% | 61.1% | 75.0% | 50.0% | 25 | 100% |
| Candidate, adversarial (frozen) | **FAIL** | 50.0% | 62.5% | 56.3% | 75.0% | 0.0% | 35 | 100% |

500 / 200 / 90 predictions respectively (all cases × 5 runs). Reports and predictions are in `tests/a001/results/`; v1 and v2 history is preserved. The scorer only ever sees source text, key ideas and transcript; this is proven by `tests/a001/test_adapter.py`.

**Harness finding:** for partial, wrong and contradiction cases, A001’s expected clue levels follow the source’s position, not the answer’s content (`docs/evidence/a001/clue-level-artefact-analysis.txt`). A content-based scorer can therefore reach at most 61.1% exact and 94.4% within ±1, both below the gate. The thresholds were not weakened, and ids were not exploited. The scorer also fails on label accuracy and safety on its own, so the decision would be the same without this artefact.

**Consequence:**
- the app uses self-check against visible, source-backed points plus objective questions;
- no automatic marking or percentages come from AI;
- the scorer is not reachable from the UI;
- the FSRS model remains shadow-only.

## Not verified

- **Physical iPhone:** no on-device test of any kind (installation, standalone mode, VoiceOver, dictation, storage persistence, keyboard overlap, speech voices).
- **iOS Safari / WebKit:** not run.
- **Hosted deployment:** none. No public URL exists.
- **Native:** EAS build, signing, TestFlight; any simulator or device run; Expo Go compatibility; 2 `expo-doctor` network checks; the Windows 11 command sequence (documented but not executed on Windows).
- **Providers:** no real transcription, key-idea or scoring model was called (by design). The optional API was tested only with fakes and mocked HTTP.
- **Human-labelled validation** of any scorer (Gate F): not started.
- **Facts in passages:** checked by authors against general knowledge (`factNotes`); not independently fact-checked by a second human.

## Known limitations (honest list)

- Voice input is via the iPhone keyboard’s dictation, not an in-app microphone.
- Pasted text gets automatically chosen key sentences (keyword heuristic, labelled “not AI”), not written summaries, and has no understanding questions.
- Browser storage can be cleared by the system. Backups are manual (with a reminder).
- The candidate scorer misses some mishearings, for example homophones with a different first sound.
- Re-reading a finished bundled passage keeps its review points linked to the first copy.
- Engineering defaults (chunk sizes, adaptation thresholds, review steps) are not clinically validated.

## For Marco

1. **URL:** none yet (not deployed). See `docs/DEPLOYMENT.md`: one click with GitHub Pages (public), or upload `release/recall-pwa-1.0.0.zip`.
2. **Install from Safari:** open the https link → Share → Add to Home Screen → open once online.
3. **10-minute test:** `docs/IPHONE-INSTALL-AND-TEST.md`.
4. **After the subscription ends:** everything is in this branch; start with `README.md` and `CLAUDE.md`. Summary in `docs/HANDOFF-MARCO.md`.

## Remaining actions (external only)

1. **Repository visibility:** the repository is public, but contains the original pack and hand-off with personal context. Decide whether to make it private (owner only) and whether to rewrite history.
2. **Approve and host the PWA** (GitHub Pages click, or any static https host).
3. **Run the physical iPhone checklist** with Dave and record the results.
4. **Optional:** create a `main` branch and open a pull request (none could be created: there is no base branch).
5. **Optional, later:** Apple Developer Program and Expo accounts → `eas build --platform ios --profile development` → TestFlight.

## Final record

| Item | Value |
|---|---|
| Code verified at | commit `2b85799` — `npm run verify -- --full`, exit 0 |
| Test counts | 115 unit (core, content, storage, IndexedDB, backup, scheduler, scorer, audit regressions) · 87 Playwright e2e (2 viewports) · 144 API (pytest) · 18 native (Jest) · A001: original 7/7 harness tests + oracle + baseline + 3 candidate evaluations (790 predictions) |
| PWA release ZIP | `release/recall-pwa-1.0.0.zip` — 13 files, 579 KB, SHA-256 `a07973036e489adeadfce70b28945151f0efee4ff1c57f194756770f00ae32f3` (deterministic; see `release/SHA256SUMS.txt`) |
| PWA build cache version | `d1981640c7b6b19a` (content hash of the build) |
| Original pack | SHA-256 `d04965731c857d791468e67214adaf5737d191889edb0f3b255153e345921980`, 32/32 files verified unchanged |
| Pull request | Not created: the repository has no base branch (see Remaining actions) |
| Final commit | the commit that adds this report (reported in the hand-off message) |
