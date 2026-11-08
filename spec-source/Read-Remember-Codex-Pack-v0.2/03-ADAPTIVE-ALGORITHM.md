# Adaptive Algorithm v0.1

## 1. Chunk selection

State:
- `target_words`
- `recent_novel_chunk_recall`
- `recent_comprehension`
- `recent_clue_dependency`
- `user_too_much`
- `information_density`
- `semantic_boundaries`

Initial configurable values:
- target 80 words;
- min 40;
- initial max 180;
- normally 1–2 key ideas;
- hard max 3.

Boundary selection must prefer complete semantic units over exact word counts.

Adapt no more than one major difficulty dimension per session.

Starting rule:
- delayed recall >= .85 AND comprehension >= .85 AND clue dependency <= .20 -> consider +10%;
- delayed recall .55–.84 -> hold;
- delayed recall < .55 -> consider -15%;
- explicit "too much" -> reduce immediately.

Use a rolling window of novel chunks. Do not react to one isolated failure.

## 2. Key-idea extraction

For each chunk:
- extract 1–3 ideas;
- tag importance;
- identify source span(s);
- identify critical qualifiers;
- identify relationships;
- verify the idea is entailed by the source.

Reject unsupported ideas.

## 3. Recall scoring

Per idea:
- concept coverage: 55%;
- semantic entailment: 35%;
- relationship accuracy: 10%;
- contradiction check: hard override/penalty.

These weights are a starting engineering hypothesis and must remain configurable.

Do not score language fluency.

## 4. ASR

If an ASR error may alter meaning:
- label `asr_uncertain`;
- score `null`;
- clue `null`;
- action `confirm_transcript`.

After user confirmation, score the confirmed text.

## 5. Clue ladder

0 independent
1 structural
2 semantic
3 cloze/strong cue
4 source sentence
5 full chunk/reread

Recall strength for initial scheduler mapping (configurable):
- 0 -> 1.00
- 1 -> .85
- 2 -> .65
- 3 -> .40
- 4 -> .20
- 5 -> 0.00

## 6. Scheduler

Each key idea stores:
- difficulty;
- stability;
- retrievability;
- last review;
- total recalls;
- independent recalls;
- highest clue;
- review history.

Prefer FSRS-style scheduling. The live scheduler remains shadow-only until release gates pass.

Map:
- fail/source reveal -> AGAIN;
- substantial cues -> HARD;
- correct with little/no support -> GOOD;
- strong delayed independent recall -> EASY.

## 7. Transfer

Create fresh passages that are not practised before evaluation.

Report trained and transfer performance separately.

## 8. Adaptation priority

Optimise for:
1. delayed independent recall;
2. comprehension;
3. low clue dependence;
4. tolerable effort;
5. transfer to fresh material.

Do not optimise primarily for same-minute recall.
