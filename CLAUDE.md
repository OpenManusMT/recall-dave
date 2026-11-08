# CLAUDE.md — recovery instructions for a coding agent

You are continuing **Recall** (Read & Remember). Read, in this order: `docs/EXECUTION-STATE.md` (where things stand), `docs/RELEASE-REPORT.md` (what is and is not verified), `docs/ARCHITECTURE.md`, `docs/SPEC-TRACEABILITY.md`, then the master brief `spec-source/handoff/Recall_Dave_Claude_Code_Cloud_Master_Build_Prompt.md` and the original pack `spec-source/Read-Remember-Codex-Pack-v0.2/`.

## Ground rules (do not break)

- Never modify anything in `spec-source/`. `tests/a001/test_adapter.py` checks it byte-for-byte against `MANIFEST.json`.
- Never change the A001 thresholds. Never let the scorer see ids, tags or expected answers. Never report the A001 development-set result as generalisation (the holdout in `tests/a001/holdout/` is frozen by `FROZEN.sha256`).
- The automatic scorer stays **disabled** and `schedulerMode` stays **`shadow`** until Gate B (A001 + holdout) **and** Gate F (human-labelled validation, shadow discrepancy review, recorded product decision) genuinely pass.
- No clinical language, no diagnosis fields, no “brain score”, no streaks.
- No network calls from the apps; no secrets in source; no paid services without the owner’s approval; no deployment to a public site without approval.
- Never claim device, EAS, TestFlight or deployment results without an execution receipt.
- Add a regression test for every bug and record it in `docs/IMPROVEMENT-LOG.md`.

## Commands

```bash
npm ci && npm run verify          # the whole free verification suite (writes docs/evidence/verify-latest.md)
npm run verify -- --quick         # skip e2e and A001 while iterating
npx vitest run packages/core      # core unit tests
npx playwright test               # e2e (build first: npm run build)
npm run a001                      # harness + candidate scorer evaluation
cd apps/mobile && npm ci && npx tsc --noEmit && npx expo export --platform ios --output-dir dist-ios
```

## Where things live

- Domain logic: `packages/core/src` (`repo.ts` is the main operations API; `ladder.ts` the self-check; `scheduler.ts`; `chunker.ts`; `backup.ts`).
- Web UI: `apps/web/src` (`components/ChunkFlow.tsx` is the core read → recall → check flow).
- Native UI: `apps/mobile/app` (mirrors the web flows on the same core).
- Content: `packages/content/src` — every passage must pass `validatePassage` (verbatim spans, qualifiers, UK spelling).

## Known next steps

See the “Remaining actions” section of `docs/RELEASE-REPORT.md`.
