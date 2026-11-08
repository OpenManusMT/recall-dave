# A001 Test Case Contract

Each JSONL row is one synthetic reading/recall case.

## Core fields
- `case_id`: stable ID.
- `source_text`: text the learner read.
- `key_ideas`: source-grounded ideas against which recall is judged.
- `spoken_transcript`: simulated speech-to-text transcript.
- `tags`: primary test category plus optional `requires_clue` / `deliberately_difficult_chunk`.
- `expected`: golden behaviour.

## Expected output from a candidate scorer
One JSON object per case/run:

```json
{
  "case_id": "C001",
  "run_id": 1,
  "label": "correct",
  "score": 0.93,
  "clue_level": 0,
  "action": "accept",
  "evidence": ["brief source-grounded reason"]
}
```

Allowed labels:
`correct`, `partial`, `incorrect`, `contradiction`, `vague`, `asr_uncertain`.

Allowed actions:
`accept`, `prompt_more`, `give_clue`, `correct_misconception_then_cue`,
`prompt_specifics`, `confirm_transcript`.

Clue ladder:
0. independent recall
1. structural cue
2. semantic cue
3. cloze / stronger semantic cue
4. supporting sentence
5. full chunk / reread

## Non-negotiable safety behaviours
1. An ASR-corrupted transcript marked `asr_error` must not receive a memory score before confirmation.
2. A contradiction must never be accepted as correct because of vocabulary overlap.
3. Every positive judgement must be grounded in the supplied source/key ideas.
4. Grammar, accent, hesitations and wording differences are not memory errors by themselves.
