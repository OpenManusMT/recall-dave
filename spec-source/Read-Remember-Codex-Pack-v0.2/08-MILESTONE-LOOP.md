# Milestone Loop

## A001 — synthetic harness
Status: COMPLETE.

## A002 — semantic scorer
Deliver:
- provider interface;
- fake provider;
- AI provider;
- strict schema;
- A001 500-run report.
Exit: A001 gate PASS, otherwise scorer remains blocked.

## A003 — key ideas
Deliver:
- 1–3 source-backed ideas;
- source spans;
- qualifier preservation;
- verifier.
Exit: grounding/adversarial tests PASS.

## A004 — chunker + clues
Deliver:
- semantic boundary chunking;
- information-density rule;
- clue levels 0–5.
Exit: deterministic tests PASS.

## A005 — scheduler
Deliver:
- memory-state model;
- FSRS-style recommendations;
- same-day handling.
Exit: shadow mode working; no live promotion yet.

## A006 — iPhone MVP
Deliver:
- Expo app;
- reading/recall/coaching/review/insights/privacy;
- local SQLite.
Exit: Windows tests and web/manual UI checks PASS.

## A007 — speech
Deliver:
- audio record;
- transcription adapter;
- confirmation flow;
- typing fallback.
Exit: ASR safety tests PASS.

## A008 — adversarial validation
Deliver:
- larger fixtures;
- injection/negation/qualifier tests;
- repeated runs.
Exit: all release gates applicable to synthetic testing PASS.

## A009 — EAS readiness
Deliver:
- `eas.json`;
- app configuration;
- Windows commands;
- credential checklist.
Exit: cloud build ready; if credentials absent, mark only distribution BLOCKED_EXTERNAL.

## A010 — candidate pilot
Deliver:
- clean candidate ZIP;
- execution-state report;
- pilot protocol;
- shadow scheduler.
Exit: ready for a voluntary limited test; no efficacy claims.

## Per-milestone loop
1. Inspect.
2. Implement.
3. Run targeted tests.
4. Run relevant regression tests.
5. Preserve evidence.
6. Repair bounded defects.
7. Re-run.
8. Update `EXECUTION-STATE.md`.
9. Continue unless external credentials or a safety gate genuinely blocks the next dependent action.
