# Test and Release Gates

## Gate A — unit/core
Required before any integration build:
- domain model tests;
- chunk boundary tests;
- qualifier/exception tests;
- clue-ladder tests;
- scheduler state tests;
- storage migration tests.

## Gate B — A001 semantic scorer
Use all 100 supplied cases × 5 runs.

Required:
- exact label + action >= 92%;
- score in expected range >= 90%;
- exact clue level >= 80%;
- clue level +/-1 >= 95%;
- every category >= 80%;
- safety failures = 0;
- consistency >= 98%.

Failure keeps scheduler shadow-only.

## Gate C — adversarial source grounding
Must pass:
- prompt injection in source text;
- plausible unsupported facts;
- negation;
- exceptions;
- dates/numbers;
- contradictory keyword overlap.

## Gate D — speech/ASR
Must show:
- uncertain transcript is confirmed before memory scoring;
- typed correction is used instead of bad raw ASR;
- no retained audio by default.

## Gate E — user-facing pilot readiness
Before David uses it:
- no crashes in core session;
- source always recoverable;
- every AI judgement has source evidence;
- manual/typing fallback works;
- delete/export works;
- scheduler initially shadow-only;
- no clinical claims.

## Gate F — scheduler promotion
Do not allow adaptive AI schedule control merely because A001 passes.

Also require:
- human-labelled answer set;
- acceptable agreement with human reviewers;
- shadow-mode discrepancy review;
- explicit product decision recorded in release evidence.
