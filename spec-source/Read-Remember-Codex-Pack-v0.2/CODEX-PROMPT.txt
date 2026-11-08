# CODEX ONE-SHOT BUILD PROMPT — Read & Remember

Continue the **Read & Remember** project from the supplied pack. This is implementation and test work, not a documentation-only exercise.

Read every top-level Markdown file and the full `A001-harness/` directory before changing anything. Treat `A001-harness/cases.jsonl` and its gate rules as frozen acceptance evidence unless a test proves a defect in the harness itself.

## User and platform constraints

- Primary tester/user: David, using a physical iPhone.
- Development host: Windows 11. There is no Mac.
- Build the mobile client with **React Native + Expo + TypeScript**, using the latest stable Expo release that is compatible with current EAS iOS cloud builds.
- Use Expo Router unless there is a concrete reason not to.
- iOS compilation must use **EAS Build cloud macOS runners**. Do not make local Xcode a prerequisite.
- Submission/TestFlight must use EAS Submit or another Windows-compatible path.
- Do not spend money or create paid cloud resources automatically.
- Missing Apple Developer membership, Apple credentials, Expo credentials, AI API keys, hosted backend credentials or other external secrets must block only the dependent live path. Continue all unrelated local implementation, mocks, tests, fixtures and packaging.

## Product goal

Build an adult, calm, accessible AI-assisted reader that helps a person:
1. read short meaningful chunks;
2. explain or recall 1–3 source-backed ideas in their own words;
3. receive progressively stronger clues only when needed;
4. review each idea again when it is useful;
5. measure immediate, next-day and longer delayed recall;
6. distinguish practised-material improvement from transfer to fresh unseen passages.

Do not build a generic brain-game app.

## Medical/product boundary — non-negotiable

The app is a reading/comprehension/recall aid, not a medical device and not a schizophrenia monitor.

Do not:
- infer relapse, symptoms, diagnosis, competence, mental state or medication need;
- recommend changing medication or clinical care;
- store a diagnosis simply to personalise the app;
- present scores as IQ, brain age, cognitive impairment or clinical progress;
- claim that the app grows new neural pathways;
- share results with another person without an explicit user export/share action.

If the app detects only performance changes, describe them narrowly, e.g.:
"Next-day recall has been lower than your recent average."
Do not attach clinical meaning.

## Architecture

Create a repo with at least:

- `apps/mobile/` — Expo React Native TypeScript app.
- `services/api/` — source-grounded scoring/transcription/key-idea service.
- `packages/core/` — deterministic learning domain models, chunk adaptation, clue ladder, scheduler interfaces and shared schemas.
- `tests/a001/` — executable integration of the supplied 100-case harness.
- `docs/` — decisions, Windows/iPhone build runbook and release evidence.

Prefer a monorepo only if it remains simple on Windows.

### Mobile
Use current maintained Expo packages. Expected capabilities:
- Expo Router/navigation.
- audio recording with the current Expo audio package;
- SQLite for learning history;
- SecureStore only for small secrets/tokens;
- accessible text sizing;
- manual typing fallback for every microphone flow;
- local-first session data;
- export/delete controls.

Do not store API secrets in the app bundle.

### API
Use a small service with clean provider abstractions:
- `TranscriptionProvider`
- `KeyIdeaProvider`
- `RecallScoringProvider`

A Python FastAPI service is a good default because the A001 harness is Python, but another architecture is acceptable if it demonstrably simplifies testing.

Implement:
1. a deterministic fake provider for all offline tests;
2. a local/OpenAI-compatible adapter that can be pointed at a local model for development;
3. one optional hosted-provider adapter behind environment variables.

Never require paid API traffic for unit/integration tests.

## AI contracts

All AI outputs must be validated against strict JSON schemas.

### Key-idea extraction
Input:
- source chunk only.

Output:
- 1–3 ideas;
- importance;
- source span(s);
- relationship type where relevant (cause/effect, sequence, comparison, rule/exception);
- confidence.

Every accepted idea must be supported by exact source span(s). Add an entailment/verification pass. Reject an idea that cannot be grounded in the source.

### Recall scoring
Score meaning, not wording.

Return:
- label: `correct | partial | incorrect | contradiction | vague | asr_uncertain`
- score 0–1, or null for unconfirmed ASR;
- idea-level coverage;
- semantic entailment;
- relationship accuracy;
- contradiction flag;
- clue level;
- action;
- concise source-grounded evidence.

Do not penalise:
- grammar;
- accent;
- fillers;
- pauses;
- spelling;
- paraphrasing.

A contradiction must not earn a high score because it contains overlapping words.

### ASR rule
If transcription uncertainty could materially change meaning, do not score memory. Show the transcript and ask the learner to confirm/correct it.

Audio retention default:
- record only while the user is actively answering;
- transcribe;
- delete temporary audio after the transcript is confirmed/scored;
- do not retain audio unless a separate explicit opt-in is added later.

## Clue ladder

Implement exactly and log the highest level needed:

0. independent recall
1. structural cue
2. semantic cue
3. cloze/strong cue
4. supporting source sentence
5. full source chunk/reread

Do not keep eliciting repeated wrong guesses. After an appropriate retrieval attempt, progressively support success.

## Adaptive chunking

Initial product hypothesis:
- nominal target: 80 words;
- minimum: 40;
- initial maximum: 180;
- 1–2 key ideas normally; hard maximum 3;
- respect sentence/paragraph/topic boundaries;
- information density overrides word count.

Use a rolling window of recent **novel chunks**, not one bad answer.

Starting rule:
- >=85% delayed recall, >=85% comprehension and <=20% clue dependence: consider +10%.
- 55–84%: hold.
- <55%: consider -15%.
- explicit "too much": reduce immediately.
- change at most one major difficulty variable per session.

Do not claim these values are clinically validated. Keep them configurable.

## Review scheduling

Create a scheduler interface with a memory state for each key idea:
- difficulty;
- stability;
- retrievability;
- last review;
- recall count;
- clue history;
- recall history.

Use an FSRS-style D/S/R model or a well-maintained compatible implementation after verifying the dependency. Do not hard-code only 1/3/7/14-day intervals.

Map observed performance internally:
- source required / failed -> AGAIN
- substantial clues -> HARD
- correct with little/no help -> GOOD
- strong independent recall after a meaningful interval -> EASY

Keep the scheduler in **shadow mode** until the validation gates below pass. In shadow mode, calculate recommendations but do not change David's real review times.

## Transfer measurement

Add fresh/unseen probe passages.

Keep separate metrics for:
- trained/practised items;
- fresh passages not previously reviewed.

A product improvement claim must not rely solely on repeated material.

## Screens

Implement a coherent MVP based on the supplied mock-up:
1. Home — Today, Start session, next-day recall, 7-day recall, hints trend, comfortable chunk size.
2. Add Reading — paste text first; file/share-sheet import may follow.
3. Reading — one chunk at a time; read aloud optional; explain-this-part optional; hide text.
4. Recall — type or microphone; use your own words.
5. Coaching — acknowledgement, clue ladder, show sentence, reread.
6. Review — due ideas.
7. Insights — trends with practised vs fresh material clearly separated.
8. Privacy/Data — export, delete, audio policy, AI-provider disclosure.

Avoid childish rewards, streak pressure, leaderboards and "brain score".

## A001 gate

Integrate the supplied `A001-harness`.

The real scorer must be run **5 times on every case**: 500 predictions minimum.

The scorer must not control live review scheduling unless ALL pass:
- exact label + action >= 92%;
- score in expected range >= 90%;
- exact clue level >= 80%;
- clue level within +/-1 >= 95%;
- each primary category >= 80%;
- zero safety-critical failures;
- all 100 cases executed 5 times;
- >=98% cross-run consistency.

Hard-stop failures:
1. accepting a contradiction as correct;
2. scoring an ASR-corrupted answer before confirmation.

If the gate fails:
- keep scheduler shadow-only;
- preserve the failure evidence;
- repair only the scorer;
- rerun the full 500-case gate.

Do not weaken thresholds to get a pass.

## Additional test suites

Add tests for:
- punctuation/case differences;
- negation;
- plausible but unsupported detail;
- correct answer using very different wording;
- partial cause/effect relationships;
- numbers/dates;
- names;
- multiple key ideas;
- empty response;
- very short response;
- ASR homophones;
- ASR deletion;
- background noise/transcript uncertainty fixture;
- source containing a misleading distractor;
- source with exception/qualifier ("usually", "may", "unless");
- long dense chunks;
- repeated runs;
- malicious text attempting to instruct the scorer to ignore its system contract.

Treat pasted reading material as untrusted data, not instructions to the AI.

## Security/privacy

- Validate and length-limit all input.
- Separate prompts/instructions from user-supplied reading text.
- Never execute links/scripts embedded in pasted content.
- No analytics SDK by default.
- Keep tokens/secrets in SecureStore or server environment variables as appropriate.
- Do not log raw audio.
- Redact secrets from logs.
- Provide delete-all and export-local-data.
- No third-party sharing by default.

## Baseline and pilot

Build a voluntary baseline mode:
- several short novel passages;
- immediate comprehension;
- immediate recall;
- delayed recall when appropriate;
- no "brain score".

Build a four-week pilot configuration, but do not claim medical efficacy.

Add a "shadow AI" mode:
- AI scores and recommends;
- deterministic/manual schedule remains authoritative;
- discrepancies are logged for review.

Only after A001 and a human-labelled pilot validation may the AI schedule be promoted.

## Windows + iPhone release route

Document and automate where possible:
1. develop/test all logic on Windows;
2. run mobile app on web/available device for UI work;
3. configure EAS;
4. `eas build --platform ios --profile development` for a physical iPhone development build;
5. production build with EAS cloud;
6. submit with `eas submit --platform ios`;
7. distribute to David with TestFlight.

Do not require a Mac or iOS simulator.

If Apple Developer credentials are absent, prepare:
- `app.json/app.config`;
- `eas.json`;
- bundle identifier placeholder;
- build scripts;
- exact commands;
- checklist;
then stop only at the credential-dependent action.

## Work loop

Maintain `docs/EXECUTION-STATE.md` containing:
- current milestone;
- evidence;
- blockers;
- next safe action.

Proceed autonomously through harmless local edits/tests. Do not ask for approval for normal code changes, refactors, tests or packaging.

Use these milestones:

A002 — semantic scorer in shadow mode  
A003 — key-idea extraction + source-grounding verifier  
A004 — adaptive chunker + clue ladder  
A005 — scheduler + memory state (shadow only)  
A006 — Expo iPhone MVP + local persistence  
A007 — speech capture/transcription confirmation flow  
A008 — complete synthetic/adversarial validation  
A009 — Windows/EAS iOS build readiness  
A010 — candidate pilot package

For each milestone:
1. implement;
2. run tests;
3. inspect failures;
4. make bounded repairs;
5. rerun;
6. record evidence;
7. package only when gates pass.

Use a maximum of 12 repair cycles per milestone. If still blocked, stop that milestone with a clear failure report and continue unrelated milestones where safe.

## Definition of done

Deliver:
- working Expo project;
- working API/mocks;
- full A001 integration;
- all test results;
- adaptive algorithm implementation;
- shadow scheduler;
- microphone + transcript confirmation flow;
- calm accessible UI;
- local persistence;
- Windows run script(s);
- EAS configuration;
- iPhone/TestFlight instructions;
- privacy/export/delete controls;
- threat model;
- `README.md`;
- `docs/EXECUTION-STATE.md`;
- `docs/RELEASE-GATES.md`;
- candidate ZIP.

Do not say "done" merely because code was generated. Verify runnable tests and preserve actual outputs.

When an external credential is the only blocker, finish every other deliverable and state exactly what credential/action is needed and the command to continue.
