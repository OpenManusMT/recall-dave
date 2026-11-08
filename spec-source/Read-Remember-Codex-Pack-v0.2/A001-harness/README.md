# Read & Remember — A001 Adaptive Scoring Test Harness v0.1

This pack is the safety gate for the AI recall scorer. **A candidate scorer must not drive David's real review schedule until this gate passes.**

## What's included

- `cases.jsonl` — 100 synthetic reading/recall cases.
- `SCHEMA.md` — scorer input/output contract and clue ladder.
- `candidate_scorer.py` — integration stub for the real AI scorer.
- `baseline_scorer.py` — deliberately weak lexical-overlap scorer.
- `run_scorer.py` — runs any scorer repeatedly against all cases.
- `evaluate.py` — evaluates outputs and applies the production gate.
- `make_oracle_predictions.py` — verifies the harness itself using golden answers.
- `tests/test_harness.py` — dataset and gate unit tests.
- `baseline_predictions.jsonl` / `oracle_predictions.jsonl` — example outputs.
- `BASELINE_REPORT.json` / `ORACLE_REPORT.json` — example gate reports.

## Coverage

100 cases:
- 20 correct paraphrases
- 20 partial recalls
- 20 wrong answers
- 20 contradictions
- 10 vague answers
- 10 speech-to-text / ASR corruption cases

Additional coverage:
- 25 cases use deliberately dense/difficult chunks.
- clue levels 0 through 5 are all represented.
- every case contains source-grounded key ideas.
- ASR cases contain both the corrupted transcript and the learner-confirmed transcript.

## Production gate

A scorer is allowed to affect a real review schedule only if it meets **all** of these:
- exact label + action >= 92%
- score inside the expected range >= 90%
- exact clue level >= 80%
- clue level within ±1 >= 95%
- every category >= 80% exact label + action
- zero safety-critical failures
- 5 repeated runs for every case
- >= 98% cross-run consistency

Two failures are treated as especially serious:
1. accepting a contradiction because it shares words with the source;
2. reducing a memory score because speech recognition corrupted the learner's answer.

## Quick start

From this directory:

```bash
python make_oracle_predictions.py --runs 5 --out oracle_predictions.jsonl
python evaluate.py --predictions oracle_predictions.jsonl --out ORACLE_REPORT.json

python run_scorer.py --scorer baseline_scorer:score_case --runs 5 --out baseline_predictions.jsonl
python evaluate.py --predictions baseline_predictions.jsonl --out BASELINE_REPORT.json

python -m unittest discover -s tests -v
```

The oracle should PASS. The weak lexical baseline should FAIL.

## Connect the real AI scorer

Implement:

```python
def score_case(case):
    return {
        "label": "correct|partial|incorrect|contradiction|vague|asr_uncertain",
        "score": 0.0,          # null for unconfirmed ASR
        "clue_level": 0,       # null for unconfirmed ASR
        "action": "accept|prompt_more|give_clue|correct_misconception_then_cue|prompt_specifics|confirm_transcript",
        "evidence": ["short source-grounded rationale"]
    }
```

Then run:

```bash
python run_scorer.py --scorer your_module:score_case --runs 5 --out candidate_predictions.jsonl
python evaluate.py --predictions candidate_predictions.jsonl --out CANDIDATE_REPORT.json
```

Only when `production_schedule_allowed` is `true` should the scorer be permitted to update the live memory scheduler.

## What v0.1 intentionally does not prove

Passing this synthetic harness is necessary, not sufficient. Before release we should also add:
- human-labelled answers from consenting adults;
- noisy real speech samples and multiple accents;
- adversarial paraphrases and negation;
- very short and very long source passages;
- inter-rater agreement between human reviewers;
- a shadow-mode period where the AI scores sessions but cannot alter the schedule.
