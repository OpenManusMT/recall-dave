# RECALL / READ & REMEMBER — MASTER AUTONOMOUS BUILD PROMPT FOR CLAUDE CODE CLOUD

**Commissioned by:** Marco  
**Intended user:** David (Dave), on a real iPhone  
**Date:** 8 November 2026  
**Goal:** Complete, independently tested, maintainable application with an immediately usable iPhone web-app route and a properly prepared native iOS route.  
**Execution mode:** IMPLEMENT — do not stop after writing a plan.

## 0. Your mission and operating rules

You are the principal product engineer, mobile engineer, UX designer, test engineer, security reviewer and release engineer for **Recall** (previously **Read & Remember**). Build and verify the product in this GitHub repository. Do not deliver a proposal, mock-up, scaffold, screenshots without working flows, or untested code and call it finished. Use an **inspect → implement → test → diagnose → fix → retest → commit → repeat** loop until the defined release gates pass or you encounter a genuine external blocker.

**Start coding in this session.** Default to autonomous implementation rather than asking preference questions. Make reasonable reversible decisions and record them. Ask for an action only if an outside credential, paid membership, permission or physical-device step is genuinely indispensable. Continue all independent work when one path is blocked. Never buy services, enable billable API usage, publish a repository, expose personal information, or submit to Apple without Marco's explicit approval.

The user is on Windows 11 and has **no Mac**. Dave uses an **iPhone**. An Apple Developer account, Expo credentials, backend host, signing keys, paid model API, and physical iPhone may not be available to this cloud VM. These gaps must not prevent the rest of the project being completed. Do not say an EAS build, TestFlight release, physical iPhone test or live deployment succeeded without an actual execution receipt.

You are in a time-sensitive hand-off: Marco's Claude Max subscription is expected to end on **9 November 2026**. Prioritise working, saved source code and a transferable release over speculative future features. **Commit and push each useful milestone** to the task branch so work survives an interrupted cloud session. Create or update `docs/EXECUTION-STATE.md` continuously. Do not assume the cloud task survives subscription expiry or usage limits.

## 1. Read the original project before implementation

The repository should contain `Read-Remember-Codex-Pack-v0.2.zip` or an extracted `Read-Remember-Codex-Pack-v0.2/` directory. First:

1. Inventory the repo, Git status, existing code and all available files.
2. Safely extract the ZIP if present; read **every top-level Markdown specification**, `A001-harness/`, `MANIFEST.json`, and original development prompt.
3. Preserve the original ZIP and all A001 cases, oracle, fixtures and thresholds unchanged in a clearly labelled `spec-source/` location. Do not overwrite or silently weaken them.
4. Read any newer project files and favour newer *explicit* user decisions when they do not weaken safety or data integrity.
5. Record how this version implements or consciously differs from the original A001–A010 milestone plan in `docs/SPEC-TRACEABILITY.md`.

If the ZIP is absent, continue using this brief as a complete implementation specification; document `ORIGINAL_PACK_NOT_SUPPLIED`, implement a compatible 100-case evaluation harness, and mark comparison with the historic harness **NOT VERIFIED**, not passed. Do not block the whole task over a missing attachment.

## 2. Product: make reading and remembering easier, not a generic brain game

**Audience and style:** an adult who can understand short pieces of text but finds it difficult to retain several points. Calm, readable UK English. No infantilising language, streak pressure, leaderboards, IQ scores, brain-age metrics, judgmental feedback or clinical claims. All activities must be voluntary, untimed by default and easy to pause.

**Two modes:**
- **Help me read this:** understanding first, with short coherent chunks, read-aloud where supported, explanations and source visibility.
- **Help me remember this:** read a small chunk, hide it, retrieve the main ideas without looking, receive the least help needed, then revisit them later.

**Essential complete user journey (must work, not just render):**
1. Open app; simple, optional onboarding with font size and input preference; allow immediate start without signup.
2. Tap **Start a session** or **Choose something to read**.
3. Select from at least **20 original, carefully edited bundled passages** across everyday adult subjects, or paste personal reading. The bundled passages, associated key ideas, clues and questions must work without an internet connection.
4. Read one coherent chunk, target 80 words (configurable minimum 40, starting maximum 180; meaningful semantic boundaries outrank word count). Normal target 1–2 main ideas, maximum 3.
5. Tap **I've read it**; hide the source but keep an explicit **Show text** action.
6. Type what was remembered in the user's own words; offer voice input only when a supported, permissioned, working transcription path is available. Never ship a dead microphone button. Keep typing always available.
7. Show a trustworthy, source-grounded review of what was remembered, make the source and its key ideas easy to inspect, and offer the next appropriate clue. Do **not** claim high-quality automatic semantic grading if it has not passed the supplied acceptance harness. Use transparent self-check plus objective comprehension questions as the no-AI fallback.
8. Save progress locally; schedule and present **Reviews due** in retrieval-first order; show concise feedback and a calm **Finish session** screen.
9. Show separate trends for previously practised material and *new/unseen passage probes*, not a deceptive overall improvement score.
10. Allow adjusting reading size, pausing/resuming, reviewing data, exporting/importing a backup and deleting everything, all without an account.

**Clue ladder; exactly these levels:**
0 independent recall; 1 structural cue; 2 semantic cue; 3 cloze/strong cue; 4 supporting source sentence; 5 full chunk/reread. Log the highest clue needed. A repeated wrong guess should lead to a helpful cue rather than frustration.

**Adaptation:** A rolling window of recent *new* chunks, not a single poor attempt. Starting hypothesis: delayed recall ≥85%, comprehension ≥85% and clue dependence ≤20% → consider +10% chunk target; delayed recall 55–84% → hold; delayed recall <55% → consider −15%; an explicit **Too much text** selection reduces the next chunk immediately. Adjust no more than one major variable per session. Label these engineering defaults, not medically validated thresholds. Keep user override.

**Review scheduling:** implement a documented FSRS-style or vetted equivalent abstraction with difficulty, stability, retrievability, dates and clue history. Preserve both proposed and actual review dates. Start **adaptive scheduling in shadow mode**, meaning the advanced model makes recommendations but does not alter Dave's real review schedule until the original pack's later human-validation criteria are met. Give users functional, safe review dates using a transparent, non-AI fallback schedule until then. Do not conflate shadow recommendations with active due dates.

**Progress:** independent immediate recall, next-day and approximately seven-day recall (when actually measured), comprehension, clue dependence, comfortable chunk size, and transfer on new passages. If no delay has elapsed, say **Not measured yet**. Do not invent longitudinal outcomes or treat repeatedly rehearsed material as novel transfer.

## 3. Architecture and deliverable platforms

### Primary source architecture — preserve original design

- **TypeScript + React Native + current compatible stable Expo SDK + Expo Router** in `apps/mobile/`.
- `packages/core/`: pure, extensively tested TypeScript domain logic for chunking, clues, local objective assessments, learning state, review scheduler, schemas and progress calculations.
- `services/api/`: optional Python FastAPI (or equally testable alternative) for secure AI adapters and transcription; do not make a remote API a prerequisite for ordinary reading sessions.
- `tests/a001/`: the preserved original Python benchmark integrated with the actual scoring adapter, not a toy example.
- `docs/`: architecture, decisions, installation, testing, privacy, release, blocked external steps and full hand-off.

Use maintained dependencies and lock files. Keep the codebase as simple as compatible with the requirements. Prefer a thin native app using **SQLite for local iOS records** (schema migrations tested). Keep secret material in appropriate device/server secure storage, never in committed source or bundled JavaScript. No persistent backend account or database for personal reading history.

### Immediately usable iPhone fallback — a real installable PWA

In parallel with native-readiness, deliver a **working HTTPS-deployable Progressive Web App** that shares as much pure core logic as possible. Prefer Expo Web/React Native Web where this is robust; if its offline packaging or storage support is unreliable, create a small Vite/React web shell consuming the **same** core package (do not duplicate scoring or scheduler algorithms). Use IndexedDB on web, a correct service worker and cache manifest, icons, `display: standalone`, iOS safe-area handling and accessible touch controls. Cache all bundled reading material, fonts and runtime assets needed offline. Do not use an obsolete AppCache implementation.

A PWA installed via Safari **Add to Home Screen** should function fully offline after the initial successful load. Web APIs such as speech synthesis/transcription must use feature detection and graceful fallback. Retention of browser data can vary; provide local backup export/import with clear guidance. A public URL is required for Dave to install it; do not pretend a localhost-only site is deployed.

Make a reusable `dist/` build and an automated, documented static hosting route, e.g. GitHub Pages *only if repository visibility, permissions and site configuration permit*. Never change a private repo to public without approval. If cloud access cannot deploy, include the exact built artefact, GitHub Actions workflow, and non-secret deployment instructions. Record `DEPLOYMENT_BLOCKED_EXTERNAL` rather than claiming a live URL.

### Native iPhone distribution

Create valid Expo project metadata, icons, permission descriptions, `eas.json` profiles for simulator, development and production, and Windows-compatible EAS instructions. Verify with Expo tooling where possible (`expo-doctor`, config evaluation, TypeScript, bundling, supported package checks). Use EAS cloud macOS builds **only if authorised account, tokens and signing credentials are already available without cost**. Normal signed-device/TestFlight routes require Apple Developer membership/credentials. If unavailable, mark precisely `IOS_SIGNING_BLOCKED_EXTERNAL`, while finishing all other work. Do not claim automated browser tests prove native iOS app behaviour, or that an unsigned `.ipa` will install on Dave's iPhone.

## 4. Safe source-grounded scoring and AI contracts

Implement `TranscriptionProvider`, `KeyIdeaProvider`, `RecallScoringProvider` interfaces with strict schema validation, bounded inputs, fake deterministic adapters for free tests, an optional local/OpenAI-compatible endpoint adapter, and a hosted-provider adapter disabled until credentials and consent exist. Any provider key must remain **server-side**. No live model calls by default. Pasted content is untrusted data; never obey instructions embedded within a passage or execute links/scripts supplied as reading text.

For each extracted main idea retain exact supporting source spans, qualifiers (e.g., usually, unless, may), relation (cause/effect, sequence, comparison, fact, rule/exception) and confidence. Reject unsupported source claims. An AI-produced explanation must have source evidence or clearly be unavailable.

Recall labels: `correct`, `partial`, `incorrect`, `contradiction`, `vague`, `asr_uncertain`. Score in [0,1] only when justified; `asr_uncertain` requires a **null score and confirmation/correction before evaluation**. Contradictions must override superficial keyword overlap. Don't penalise accent, spelling, filler or grammar. Use the provided JSON result contracts from the source pack.

**Critical scoring release gate:** For the true candidate semantic scorer, evaluate **all 100 original A001 cases in five independent runs (500 predictions)**, preserving predictions/reports. Requirements are exactly: label+action ≥92%, score in expected range ≥90%, exact clue level ≥80%, clue within ±1 ≥95%, each primary category ≥80%, ≥98% run-to-run consistency, and **zero safety-critical failures**. Zero tolerance for treating a contradiction as correct or scoring meaning-altering ASR without confirmation. The oracle fixture is not a product scorer; it must not be presented as independent success. Never tune on then report the same cases as unbiased generalisation. Add an independent holdout and adversarial cases. Never weaken thresholds to claim PASS.

If semantic scoring fails, the **app must still be fully usable** by asking objective, source-specific questions and letting Dave self-check free recall against visible key points. Mark semantic scoring **EXPERIMENTAL/DISABLED**, preserve failure evidence and keep adaptive scheduler in shadow mode. No fake AI feedback or invisible fallback that produces unreliable percentages.

**Speech:** User-triggered only, permission asked at point of need, no background recording, transcript review when uncertainty could change meaning, delete temporary audio by default after the task, never log voice files. If safe transcription requires a backend and there is no authorised backend, use typing in the release and clearly document voice as blocked/optional. Never upload voice or reading text to a model provider without transparent consent and provider disclosure.

## 5. Data protection, safety, accessibility and UX

- Default private, local-first; no accounts, subscriptions, adverts, ad tracking, analytics SDK or medical diagnosis fields.
- Not a diagnostic, psychiatric, rehabilitation or medication-advice tool. Do not infer a condition or clinical decline from test results; do not claim a therapeutic effect or changes to neural pathways. Reports describe reading practice only.
- Data model covers learner settings, reading document/chunk, key ideas, confirmed recall attempts, clue history, reviews, strategy use and fresh-transfer probes. Version and test storage migrations. Provide **Export backup / Import backup / Delete all data** with validation, schema migration and clear confirmation.
- Error-safe persistence: app restart mid-session, duplicate taps, interrupted writes, app updates, timezone and DST changes, corrupted import, storage quota and offline refresh.
- Large accessible type; adjustable font sizes; high contrast and dark mode; VoiceOver-friendly labels and focus order; tap targets ≥44×44 pt where practical; safe areas and keyboard avoidance; no time pressure; reduced motion; no horizontal overflow at narrow widths; friendly empty and error states.
- Design the 8 original flows: Home, Add Reading, Reading, Recall, Coaching, Reviews, Insights, Privacy/Data. Keep every important action discoverable in one or two taps. Use coherent native-feeling visuals, adult palette and clear everyday language, not generic developer UI.
- No unlicensed borrowed passages or icons. Create original sample passages with accurate facts and editorial proofreading. Prefer meaningful content such as everyday instructions, nature, local travel, food, history and practical explanations, with different information densities. Separate novel probes from practised content at the dataset level.

## 6. The autonomous engineering loop — repeat until verified

### Stage A — inspect, plan briefly, establish truth

Read source pack and existing code; execute the original A001 baseline/harness test **before** changes. Record baseline output accurately (the original lexical baseline was intentionally weak). Define `docs/EXECUTION-STATE.md` with a numbered backlog, evidence, commands and status: `PASS`, `FAIL`, `NOT_RUN`, `BLOCKED_EXTERNAL`. Decide the minimal technical stack. Make a short implementation plan and **immediately proceed to implementation**; do not ask for permission to continue.

### Stage B — vertical-slice working app, first

Implement the complete first-run experience: sample passage → read → hide → typed recall → source/key-idea review → save locally → due review → app restart, plus offline-capable PWA bundle. Test it. Fix defects. Commit and push this first working slice **before** polishing or adding external AI. This makes the project useful even if the cloud session stops.

### Stage C — all required features

Implement the remaining screens, 20+ complete source-backed passages, comprehension questions, clue ladder, paste custom reading, adaptations, scheduler abstraction/shadow mode, fresh probes, accessibility, insights, backup/import/delete, optional reading aloud and safe provider interfaces. Never let an external-service integration break the offline experience. Commit each stable milestone with tests.

### Stage D — repeatable automated validation

Create one root `npm run verify` (or documented equivalent) that runs every available free verification job, including:

1. `npm ci`/lockfile reproducibility, lint, TypeScript, formatting and dependency checks.
2. Deterministic core unit tests for chunk boundaries, qualifiers, negation, clues, adaptive thresholds, spaced reviews, transfer separation, scores and edge cases.
3. Storage tests: migration, save/restart/reopen, export/import round-trip, deletion, corrupt import, and no data leakage into logs.
4. API tests with fake providers, strict schema, injection resistance, credential absence, ASR uncertainty and no chargeable requests.
5. The untouched A001 harness; run five full independent candidate passes if an actual scorer exists, and preserve reports. Do **not** convert oracle PASS into candidate PASS.
6. Playwright end-to-end flows for the web version on **Chromium and WebKit** where binaries/dependencies permit, with representative iPhone-sized viewports (including 375×667 and 390×844), keyboard, tap, rotated/narrow viewport, light/dark, enlarge font, empty/error states and persistence.
7. PWA smoke tests: production build served over HTTP locally, correct manifest/scope and icons, install eligibility where testable, service-worker caching, warm-load then network-offline restart, and no outside calls for bundled activities.
8. Accessibility automation such as axe-core for critical screens, plus manual checklist for iPhone VoiceOver and standalone-mode behaviour that cloud tests cannot attest to.
9. Packaging proof: a fresh clone or clean dependency install can reproduce the build and tests; generate checksum for candidate ZIP; verify no secrets, personal recordings or runtime databases in release files.

If WebKit/remote iOS simulation cannot run in the cloud environment, record the exact failure or restriction and continue with available browsers; do not mislabel the result as iOS/Safari verified.

### Stage E — actual fix-and-improve cycles

After first green automated verification, complete **at least three distinct improvement passes**, each followed by a full regression run and a commit:
- **Pass 1 — usability:** audit as an adult first-time reader with low tolerance for clutter; minimise taps, cognitive effort, confusing terms and dead ends; improve onboarding, readability and feedback.
- **Pass 2 — reliability/safety:** attack edge cases, offline startup, persistence, import errors, unreliable scoring, prompt injection, ASR uncertainty and awkward iOS browser behaviour.
- **Pass 3 — performance/accessibility:** measure bundle and render behaviour, unnecessary dependencies, keyboard/VoiceOver/contrast/focus and touch layouts; optimise verified problems, not arbitrary benchmark numbers.

For each improvement, record **problem observed → reproduction/test → fix → test evidence → remaining limitation** in `docs/IMPROVEMENT-LOG.md`. Add regression tests for every bug. Continue targeted fixes until all applicable hard release gates pass or the environment genuinely blocks them. Never mark an unrun step as passing.

### Stage F — independent final audit and deliver

Act as a sceptical reviewer who did not write the code. Attempt to break the app following the full user journey, including offline usage, session interruption, contradictory text and data deletion. Verify that docs match the implemented commands and no feature is advertised that silently does nothing. Re-run all tests from a clean checkout. Remove dead buttons, placeholders, demo-only state and misleading progress claims. Record the final run commands, test counts, logs, build/package checksums, commit hash and blockers.

## 7. Non-negotiable acceptance criteria

A release is **READY_FOR_DAVE_PWA_PILOT** only when all of these are evidenced:

- A real HTTPS-deployable production PWA build exists with manifest, icon, service worker and install instructions. If an HTTPS URL is unavailable, status is `BUILT_NOT_DEPLOYED`, not pilot-ready.
- Bundled session flows work while offline after installation: read → hide → recall → check → hint → finish → review.
- At least 20 complete edited offline passages with verified, source-backed answers and no placeholder content.
- Local progress persists across reloads, and successful backup/import/delete have executable tests.
- A controlled live schedule exists; any **advanced AI schedule stays shadow-only** until all its promotion gates are genuinely met.
- No clinically framed scores, fabricated AI semantic claims, hard-coded API keys, fee-charging calls or unconsented uploads.
- All available automated checks green and limitations honestly labelled; no known crash or data-loss bug in the critical journey.
- An explicit 10-minute **physical iPhone verification checklist** exists for Dave and Marco; until they run it, label **PHYSICAL_IPHONE_NOT_TESTED**.

An **IOS_NATIVE_READY_FOR_SIGNING** result additionally needs verified Expo project configuration, compatibility checks and EAS profiles. Only claim **IOS_DEVICE_BUILD_VERIFIED** after a real, correctly signed iOS build and on-device test. Do not combine these separate labels.

## 8. Deliverables that must exist in GitHub before you stop

1. Complete runnable source and dependency lock files; documented `npm run dev`, `npm run build`, `npm run verify` (or exact actual commands).
2. A reproducible offline-web production build and a release ZIP containing distributable assets, plus an optional complete source ZIP when size permits.
3. Native Expo iOS project and EAS configuration with exact Windows-to-iPhone commands, signing prerequisites and truthful build status.
4. Unit, integration, Playwright, accessibility and original scoring-harness tests with preserved outputs.
5. `README.md`, `CLAUDE.md` (recovery instructions for a later coding agent), `docs/EXECUTION-STATE.md`, `docs/RELEASE-REPORT.md`, `docs/IMPROVEMENT-LOG.md`, `docs/SPEC-TRACEABILITY.md`, `docs/SECURITY-PRIVACY.md`, `docs/IPHONE-INSTALL-AND-TEST.md`, `docs/DEPLOYMENT.md`, `CHANGELOG.md`, `LICENSE` (choose and explain a suitable permissive source licence, noting any bundled content licensing separately).
6. Screenshots of meaningful states from automated browser testing where supported; list device/browser used, never label these physical-device screenshots.
7. A small **Marco hand-off summary** with the exact GitHub branch/PR, final commit, current build status, PWA URL if actually deployed, instructions for installing on Dave's iPhone, and the smallest remaining human action.

Push the branch and create/open a pull request if the cloud GitHub integration permits. Do not merge into the default branch, change repo visibility, enable paid resources, or deploy to a public site without required approval. If pushing/PR creation is blocked, retain all commits and provide exact recovery steps. Never invent GitHub URLs or successful receipts.

## 9. Final response format

End with a concise but evidence-based report containing:

**Completed:** tested features and concrete repository paths.  
**Verified:** exact commands, pass/fail counts, browser/viewport scope, and actual commit/PR.  
**Not verified:** physical iPhone, native EAS signing, hosted deployment or providers if unavailable.  
**Release status:** `READY_FOR_DAVE_PWA_PILOT`, `BUILT_NOT_DEPLOYED`, `IOS_NATIVE_READY_FOR_SIGNING`, or precise blocked state(s).  
**For Marco:** (1) working URL if deployed, (2) instructions to install from Safari, (3) a 10-minute test script for Dave, (4) how to restore project after Claude subscription ends.  
**Remaining actions:** only the external permissions/credentials or on-device checks that absolutely cannot be performed in this environment.

**Do the engineering work now. Do not stop after outlining these stages. Preserve every completed milestone in Git.**
