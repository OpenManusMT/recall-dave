# Architecture and decisions

```
recall-dave/
├─ packages/core/      Pure TypeScript domain logic (no UI, no I/O beyond a store interface)
│   chunker · clues · ladder (self-check reducer) · scheduler (fixed + FSRS shadow) · adaptation
│   progress · settings · repo (operations) · store (interface + memory) · sqlite-store · backup
│   content validator · experimental scorer (disabled)
├─ packages/content/   22 original passages + 6 fresh-text probes (typed data, CC BY 4.0)
├─ apps/web/           PWA: Vite + React 19, IndexedDB store, generated service worker
├─ apps/mobile/        Expo SDK 58 + Expo Router native app, expo-sqlite store (own lockfile)
├─ services/api/       Optional FastAPI provider service (fake adapters; remote disabled by default)
├─ tests/a001/         Adapter + integrity guards around the untouched original A001 harness
├─ e2e/                Playwright: journey, features, PWA offline, axe, usability, reliability, perf
├─ spec-source/        Original pack and hand-off, preserved unchanged
└─ docs/               This documentation and evidence
```

## Data flow

UI (web or native) → `@recall/core` repo operations → `RecallStore` (`IdbStore` on the web, `SqliteStore` on iOS, `MemoryStore` in tests or when storage is unavailable). Every multi-record change goes through `store.batch(ops)`, which is atomic. Attempt ids are generated once per chunk, so recording is idempotent.

A chunk attempt records the learner’s words, a per-idea outcome and clue level from the self-check ladder, and the question result. `recordAttempt` then:
1. creates or updates each idea’s memory state, both the authoritative fixed step and the FSRS shadow values;
2. writes a review-log entry with the dates before and after;
3. advances the document and closes the session draft.

All of this happens in one transaction.

## Decisions (with reasons)

| # | Decision | Reason | Reversible? |
|---|---|---|---|
| D1 | npm workspaces for core/content/web; `apps/mobile` has its own lockfile | Avoids React/Metro hoisting conflicts between React DOM 19 and React Native 0.88 | Yes |
| D2 | Vite + React PWA instead of Expo Web | Reliable service worker and IndexedDB offline support on static hosting; shared core means no duplicated logic | Yes |
| D3 | Self-check + objective questions instead of automatic marking | Candidate scorer failed the A001 gate; no fake AI feedback | Yes, when a scorer passes Gates B and F |
| D4 | Fixed review steps 1, 3, 7, 14, 30, 60, 120 days are authoritative; FSRS in shadow | Transparent and safe; promotion needs Gate F (human-labelled validation) | Yes (`schedulerMode`, currently forced to `shadow`) |
| D5 | Ideas and questions are snapshotted into chunk records | Review history survives content edits in app updates | — |
| D6 | Keyboard dictation instead of an in-app microphone | No authorised transcription backend; never ship a dead mic button | Yes, via `services/api` `TranscriptionProvider` |
| D7 | Hash routing, relative base path | Works on any static host and sub-folder (GitHub Pages), offline | Yes |
| D8 | System fonts only | No network requests; native look on iPhone | Yes |
| D9 | Backup format v2 with tested migration from v1; SQLite schema v2 with tested migration | Real upgrade path from day one | — |
| D10 | Probes never enter reviews | Keeps transfer measurement separate from practice | Yes |
| D11 | Licence: MIT for code, CC BY 4.0 for the original passages | Permissive and transferable; content attribution kept separate | — |

## Engineering defaults (not clinically validated)

Chunk 80/40/180 words; adaptation +10% when delayed recall, comprehension ≥ 85% and clue dependence ≤ 20%; −15% below 55%; “Too much text” −15% immediately; minimum 3 samples before showing a percentage; next-day window 0.5–3 days; week window 5–10 days. All are in `packages/core` and configurable.
