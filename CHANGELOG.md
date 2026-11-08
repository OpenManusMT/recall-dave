# Changelog

## 1.0.0 — 2026-11-08 (first release candidate)

### Added
- Shared, tested domain core: semantic-boundary chunking (80/40/180 words, ≤ 3 ideas), clue ladder 0–5 self-check, fixed-step review schedule with an FSRS-4.5-style model in shadow mode, chunk-size adaptation over a rolling window of new parts, progress measures with practised vs fresh text kept apart, atomic and idempotent storage, versioned backup with migrations.
- 22 original passages and 6 fresh-text probes, all validated (verbatim source spans, preserved qualifiers, UK English).
- Installable offline PWA (Vite + React): Home, Read (library, paste your own), reading session (remember, read and fresh-check modes), Reviews (retrieval first), Progress, Settings with privacy, export/import/delete.
- Native Expo app on the same core (see `docs/RELEASE-REPORT.md` for its verification status).
- Optional FastAPI provider service with fake adapters and server-side safety rules (disabled for remote providers by default).
- A001 integration: the original harness runs untouched, plus a frozen independent holdout and adversarial set. The candidate scorer fails the gate and is disabled.
- `npm run verify`, Playwright e2e (journey, features, PWA offline, axe, usability, reliability, performance), release ZIP with checksums, GitHub workflows (manual Pages deploy; CI on pull requests).

### Fixed during the three improvement passes
- See `docs/IMPROVEMENT-LOG.md` (B1–B4, U1–U6, R1–R16, P1–P3, A1–A3), including an IndexedDB atomicity bug that could half-save a batch.
