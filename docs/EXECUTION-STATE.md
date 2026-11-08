# Execution state

Living log for any agent or person continuing this project. Status values: `PASS`, `FAIL`, `NOT_RUN`, `BLOCKED_EXTERNAL`, `IN_PROGRESS`.

- Branch: `claude/cool-allen-bu6jx0` (the repository's only branch and, because the repository was empty, its default branch)
- Started: 2026-11-08. Latest full verification: `docs/evidence/verify-latest.md`.

## Stage A — inspection and baseline (evidence)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| A1 | Original pack supplied (`Read-Remember-Codex-Pack-v0.2.zip`, SHA-256 `d04965731c857d791468e67214adaf5737d191889edb0f3b255153e345921980`, matches hand-off note) | PASS | `spec-source/original-zip/`, `spec-source/handoff/` |
| A2 | Pack extracted unchanged; all 32 entries of `SHA256SUMS.txt` verify | PASS | `cd spec-source/Read-Remember-Codex-Pack-v0.2 && sha256sum -c SHA256SUMS.txt`; also `tests/a001/test_adapter.py` on every A001 run |
| A3 | Original A001 harness unit tests (before any changes) | PASS (7/7) | `docs/evidence/a001-baseline/harness-unittests.txt` |
| A4 | Oracle predictions re-evaluated | PASS (harness mechanics only — not a product scorer) | `docs/evidence/a001-baseline/ORACLE_REPORT.rerun.json` |
| A5 | Lexical baseline re-run 5× | FAIL as designed (0.24 label+action, 200 safety failures), byte-identical predictions | `docs/evidence/a001-baseline/BASELINE_REPORT.rerun.json` |
| A6 | A001 clue-level labels analysed | Finding: positional, not content-based | `docs/evidence/a001/clue-level-artefact-analysis.txt` |

## Backlog

| # | Work item | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Monorepo scaffold, spec-source preservation, baseline | PASS | commits `9d93a2f`, `ce1347e` |
| 2 | `packages/core` domain logic + unit tests | PASS | `npx vitest run` |
| 3 | 22 original passages + 6 fresh-text probes | PASS | `packages/content/test/content.test.ts` |
| 4 | PWA vertical slice (read → hide → recall → check → save → review → restart) | PASS | `e2e/journey.spec.ts` |
| 5 | Full PWA feature set (8 flows, backup/import/delete, insights, settings) | PASS | `e2e/features.spec.ts`, `e2e/pwa.spec.ts` |
| 6 | Independent holdout + adversarial scorer cases (frozen before scorer work) | PASS | `tests/a001/holdout/FROZEN.sha256` (commit `ce1347e`, before the scorer) |
| 7 | Candidate local scorer, A001 5×100 + holdout + adversarial | Executed; **gate FAIL** (recorded) | `tests/a001/results/SUMMARY.md`, history v1/v2 |
| 8 | `services/api` optional provider service + tests | PASS (144 tests) | `npm run api:test` |
| 9 | Expo native app + EAS profiles + Expo checks | PASS for tsc / Jest 18 / config / iOS export; expo-doctor 18/20 (2 blocked by network) | `apps/mobile/VERIFICATION.txt` |
| 10 | Playwright e2e (Chromium 375×667 + 390×844), PWA offline smoke, axe | PASS | `npx playwright test` |
| 10b | Playwright WebKit | NOT_RUN (no WebKit build in the VM; installing browsers is not permitted there) | `docs/evidence/verify-latest.md` |
| 11 | `npm run verify` single entry point | PASS | `scripts/verify.mjs` |
| 12 | Improvement pass 1 (usability) | PASS | `docs/IMPROVEMENT-LOG.md` (commit `9c026a7`) |
| 13 | Improvement pass 2 (reliability/safety) | PASS | `docs/IMPROVEMENT-LOG.md` (commit `dbf106b`) |
| 14 | Improvement pass 3 (performance/accessibility) | PASS | `docs/IMPROVEMENT-LOG.md` (commit `5f7f70b`) |
| 15 | Final independent audit (F1–F15 fixed with tests), docs, release ZIP + checksums | PASS | `docs/IMPROVEMENT-LOG.md`, `release/`, `docs/RELEASE-REPORT.md` |
| 16 | Hosted HTTPS deployment | BLOCKED_EXTERNAL — publishing a public site needs the owner’s approval; one-click manual workflow provided | `docs/DEPLOYMENT.md` |
| 17 | Signed iOS build / TestFlight | BLOCKED_EXTERNAL (Apple Developer membership + Expo account) | `apps/mobile/README.md` |
| 18 | Physical iPhone test | BLOCKED_EXTERNAL (PHYSICAL_IPHONE_NOT_TESTED) | `docs/IPHONE-INSTALL-AND-TEST.md` |
| 19 | Pull request | NOT CREATED — the repository has no base branch (only this branch exists and it is the default) | `docs/RELEASE-REPORT.md` → For Marco |

## Environment facts (cloud VM used for this build)

- Node 22.23.4, npm 10.9.9, Python 3.13.18, Playwright 1.63.0 with Chromium build 1243 only.
- npm registry and PyPI reachable. No Apple/Expo credentials. No model API keys (none used).
- Repository visibility at release: **public** (see `docs/SECURITY-PRIVACY.md`).

## Next safe actions

1. Repository owner: decide on repository visibility (see hand-off), then enable Pages and run the deploy workflow if a public URL is acceptable, or use another static host.
2. Run the 10-minute iPhone checklist and record results in `docs/IPHONE-INSTALL-AND-TEST.md`.
3. Optional: Apple Developer + Expo accounts → `eas build --platform ios --profile development`.
