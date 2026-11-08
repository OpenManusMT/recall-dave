# Execution state

Living log for any agent or person continuing this project. Status values: `PASS`, `FAIL`, `NOT_RUN`, `BLOCKED_EXTERNAL`, `IN_PROGRESS`.

- Branch: `claude/cool-allen-bu6jx0`
- Started: 2026-11-08

## Stage A — inspection and baseline (evidence)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| A1 | Original pack supplied (`Read-Remember-Codex-Pack-v0.2.zip`, SHA-256 `d04965731c857d791468e67214adaf5737d191889edb0f3b255153e345921980`, matches hand-off note) | PASS | `spec-source/original-zip/`, `spec-source/handoff/` |
| A2 | Pack extracted unchanged; all 32 entries of `SHA256SUMS.txt` verify | PASS | `cd spec-source/Read-Remember-Codex-Pack-v0.2 && sha256sum -c SHA256SUMS.txt` |
| A3 | Original A001 harness unit tests (before any changes) | PASS (7/7) | `docs/evidence/a001-baseline/harness-unittests.txt` |
| A4 | Oracle predictions re-evaluated | PASS (harness mechanics only — not a product scorer) | `docs/evidence/a001-baseline/ORACLE_REPORT.rerun.json` |
| A5 | Lexical baseline re-run 5× and re-evaluated | FAIL as designed: label+action 0.24, score-in-range 0.30, clue exact 0.267, ±1 0.678, consistency 1.0, 200 safety failures; predictions byte-identical to the supplied `baseline_predictions.jsonl` | `docs/evidence/a001-baseline/BASELINE_REPORT.rerun.json` |

## Backlog

Statuses are updated as work lands; see the bottom of this file for the latest verification run.

| # | Work item | Status |
|---|-----------|--------|
| 1 | Monorepo scaffold, spec-source preservation, baseline | PASS |
| 2 | `packages/core` domain logic + unit tests | IN_PROGRESS |
| 3 | 20+ original passages + 6 fresh-text probes | IN_PROGRESS |
| 4 | PWA vertical slice (read → hide → recall → check → save → review → restart) | NOT_RUN |
| 5 | Full PWA feature set (8 flows, backup/import/delete, insights, settings) | NOT_RUN |
| 6 | Independent holdout + adversarial scorer cases (frozen before scorer work) | NOT_RUN |
| 7 | Candidate local scorer, A001 5×100 run, holdout run | NOT_RUN |
| 8 | `services/api` optional provider service + tests | IN_PROGRESS |
| 9 | Expo native app + EAS profiles + Expo checks | NOT_RUN |
| 10 | Playwright e2e (Chromium; WebKit if available), PWA offline smoke, axe | NOT_RUN |
| 11 | `npm run verify` single entry point | NOT_RUN |
| 12 | Improvement pass 1 (usability) | NOT_RUN |
| 13 | Improvement pass 2 (reliability/safety) | NOT_RUN |
| 14 | Improvement pass 3 (performance/accessibility) | NOT_RUN |
| 15 | Final audit, docs, release ZIP + checksums, PR | NOT_RUN |
| 16 | Hosted HTTPS deployment | BLOCKED_EXTERNAL (needs Marco's approval/host; see docs/DEPLOYMENT.md) |
| 17 | Signed iOS build / TestFlight | BLOCKED_EXTERNAL (Apple Developer membership + Expo account) |
| 18 | Physical iPhone test | BLOCKED_EXTERNAL (PHYSICAL_IPHONE_NOT_TESTED) |

## Environment facts (cloud VM)

- Node 22.23.4, npm 10.9.9, Python 3.13.18, Playwright 1.63.0 with Chromium build 1243 only (no WebKit binary present; the environment forbids `playwright install`).
- npm registry reachable. No Apple/Expo credentials. No model API keys (and none will be used).

## Next safe action

Continue backlog items in order; commit and push after each milestone.
