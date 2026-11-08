# Recall API — optional AI / transcription adapter

A small FastAPI service that a **future, authorised deployment** can put behind
the Recall app to add AI key-idea extraction, recall scoring and transcription
safely, while keeping model-provider keys **server-side only**.

- **Optional.** The Recall phone/web app works fully offline without this
  service. Nothing in the app requires it.
- **Remote providers are disabled by default.** Out of the box it runs only
  free, deterministic, in-process fake providers. Nothing is sent anywhere.
- **No scorer here has passed the A001 gate.** Not the fake lexical baseline,
  and not any OpenAI-compatible or hosted model (none has been evaluated).
  Every score response carries `"shadow_only": true` and `/v1/providers` reports
  `"a001_gate_passed": false`. Scores **must not** drive the live review
  schedule until a scorer passes `spec-source/.../A001-harness` (5 runs, all
  thresholds, zero safety failures).

For reference, the built-in fake lexical scorer, run through this service's
full safety pipeline over the 100 A001 cases × 5 runs, **FAILS** the gate:
37% exact label+action (gate ≥ 92%), 75 contradiction safety failures (gate 0),
100% ASR cases safely deferred, 100% run-to-run consistency. It exists to
exercise the pipeline, not to judge memory.

## Run it

Python 3.13. From `services/api/`:

```bash
python -m venv .venv          # or: python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
.venv/bin/uvicorn recall_api.main:app --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
py -3.13 -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest -q
.venv\Scripts\python -m uvicorn recall_api.main:app --host 127.0.0.1 --port 8000
```

Configuration comes from environment variables (see below). For example, to
point at a local OpenAI-compatible model server:

```bash
RECALL_PROVIDER=openai_compatible RECALL_LLM_BASE_URL=http://127.0.0.1:11434 \
RECALL_ALLOW_REMOTE_TEXT=1 .venv/bin/uvicorn recall_api.main:app
```

```powershell
$env:RECALL_PROVIDER = "openai_compatible"
$env:RECALL_LLM_BASE_URL = "http://127.0.0.1:11434"
$env:RECALL_ALLOW_REMOTE_TEXT = "1"
.venv\Scripts\python -m uvicorn recall_api.main:app
```

Keys are set the same way in the server's environment (or a gitignored `.env`
loaded by your process manager). `.env.example` lists the names only. Never
commit values and never ship keys in the app.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness and which providers are active. |
| GET | `/v1/providers` | Active providers, why others are disabled, and a plain-English data-flow / retention disclosure. |
| POST | `/v1/key-ideas` | `{chunk_id, source_text ≤ 4000, max_ideas 1–3}` → `KeyIdeaResult` + `provider`, `flags`, `rejected`. 422 `no_grounded_ideas` if nothing survives grounding. |
| POST | `/v1/score-recall` | `{case_id, source_text ≤ 4000, key_ideas[1–3]{idea_id,text}, learner_text ≤ 2000, transcript_meta{origin: typed\|asr, confirmed, asr_confidence?}}` → `RecallScoreResult` + `provider`, `flags`, `shadow_only`. |
| POST | `/v1/transcribe` | multipart field `audio` (≤ 5 MB, audio/* or octet-stream) → `{transcript, confidence, transcript_meta{origin: asr, confirmed: false}, requires_confirmation: true}`. 503 `transcription_unavailable` when no provider is configured. |

Errors are JSON `{"error": "<code>", "detail": "..."}`: 413 `payload_too_large`,
415 `unsupported_media_type`, 422 `invalid_request` (validation messages never
echo submitted text), 502 `provider_error` (with a fixed `code`, never the
provider's output), 503 `provider_unavailable` / `transcription_unavailable`.
`/docs` is disabled (it would load third-party CDN assets); `/openapi.json` is available.

## Providers

| Provider | Enabled when | Sends data to |
| --- | --- | --- |
| `fake` (default) | `RECALL_PROVIDER` unset or `fake` | Nowhere (in-process). |
| `openai_compatible` | `RECALL_PROVIDER=openai_compatible` **and** `RECALL_LLM_BASE_URL` set **and** `RECALL_ALLOW_REMOTE_TEXT=1` | `<base>/v1/chat/completions` only. |
| `hosted` (placeholder for a named commercial provider) | `RECALL_PROVIDER=hosted` **and** `RECALL_HOSTED_API_KEY` **and** `RECALL_HOSTED_CONSENT=1` **and** `RECALL_HOSTED_BASE_URL` (https) **and** `RECALL_HOSTED_MODEL` | `<hosted base>/v1/chat/completions` (same request shape). |

Interfaces (`recall_api/providers/base.py`): `KeyIdeaProvider`,
`RecallScoringProvider`, `TranscriptionProvider` (`typing.Protocol`).

- Fake key ideas: 1–3 verbatim source sentences with the most content words
  (about one idea per 60 words), qualifiers detected and listed.
- Fake scorer: transparent lexical-overlap baseline with a simple negation /
  antonym contradiction heuristic. `relationship_accuracy` is reported as
  `null` (not assessed) rather than invented. Weights (coverage 0.55,
  entailment 0.35, relationship 0.10) are configurable via `ScoringWeights`.
- Fake transcriber: a fixed placeholder transcript and confidence. It is only
  served in fully offline fake mode, so a real deployment can never mistake it
  for the learner's words.
- OpenAI-compatible requests: `temperature: 0`, `response_format: json_object`,
  `stream: false`, no redirects followed. The key (optional for local servers)
  is sent only as `Authorization: Bearer` to the configured host. Plain `http`
  is accepted only for loopback hosts unless `RECALL_LLM_ALLOW_INSECURE_HTTP=1`;
  URLs with embedded credentials, queries or fragments are refused.
- No silent fallback: if a remote provider is selected but not fully enabled,
  text endpoints return 503 and **no outbound request is attempted**.
- No real transcription adapter ships in this version. To add one, implement
  `TranscriptionProvider`; set `requires_file = True` if it needs a file path.

## Environment variables (names only)

| Name | Meaning (default) |
| --- | --- |
| `RECALL_PROVIDER` | `fake` \| `openai_compatible` \| `hosted` (`fake`) |
| `RECALL_TRANSCRIPTION_PROVIDER` | `fake` \| `none` (`fake`, effective only when `RECALL_PROVIDER=fake`) |
| `RECALL_LLM_BASE_URL` | OpenAI-compatible base URL (unset) |
| `RECALL_LLM_API_KEY` | Secret. Optional key for that endpoint (unset) |
| `RECALL_LLM_MODEL` | Model name sent in requests (`local-model`) |
| `RECALL_ALLOW_REMOTE_TEXT` | Consent flag; must be exactly `1` to send text (off) |
| `RECALL_LLM_ALLOW_INSECURE_HTTP` | `1` permits plain http to non-loopback hosts (off) |
| `RECALL_LLM_TIMEOUT_S` | Request timeout seconds, 1–120 (`20`) |
| `RECALL_HOSTED_PROVIDER_NAME` | Display name used in the disclosure |
| `RECALL_HOSTED_BASE_URL` | Hosted provider base URL, https only (unset) |
| `RECALL_HOSTED_MODEL` | Hosted model name (unset) |
| `RECALL_HOSTED_API_KEY` | Secret. Hosted provider key (unset) |
| `RECALL_HOSTED_CONSENT` | Consent flag; must be exactly `1` (off) |
| `RECALL_PROVIDER_RETENTION_NOTE` | Plain-text retention statement shown in `/v1/providers` |
| `RECALL_ALLOWED_ORIGINS` | Comma-separated exact CORS origins; `*` and `null` are ignored (none) |
| `RECALL_LOG_LEVEL` | `DEBUG` \| `INFO` \| `WARNING` \| `ERROR` (`INFO`) |

## Data flow and consent

`GET /v1/providers` states, in plain English, what is sent where for the
running configuration. In summary:

- **Default (fake):** reading text and answers are processed in memory on this
  server and are not sent to any other service. Audio is held in memory for the
  request only and answered with a placeholder transcript.
- **Remote text provider enabled:** the reading text (≤ 4000 characters), its
  key ideas and the typed or *confirmed* answer are sent to the named
  destination (scheme, host and port are disclosed) for key-idea extraction and
  scoring. This only happens after the operator sets the explicit consent flag.
  Unconfirmed speech-to-text answers are never sent. Retention by that provider
  is whatever `RECALL_PROVIDER_RETENTION_NOTE` states, otherwise "not stated:
  check the provider's terms before enabling".
- **This service retains nothing:** no database, no files, no analytics.
  Temporary audio files (only if a provider needs a file path) are created
  privately and deleted in a `finally` block, whether transcription succeeds
  or fails.
- **No clinical inference.** The scoring prompt forbids comments on health, diagnosis,
  capacity or intelligence; results are descriptive learning signals only.

## Safety post-processing (every provider)

Applied server-side to the output of every provider, fake, remote or
injected, after strict schema validation (`extra="forbid"`, strict types):

1. **Grounding (key ideas):** every `source_span` must occur verbatim in the
   source (NFKC, quote/dash, whitespace and case normalised, word-boundary
   aligned, ≥ 2 words). An idea with any ungrounded span is rejected. If a span
   contains a critical qualifier (usually, often, sometimes, may, might, can,
   unless, except, only, if, about, around, never, not/n't, no, most, some,
   always, …) it must be listed in `critical_qualifiers` and its family (hedge,
   negation, condition, approximation, universal) must survive in the idea text,
   or the idea is rejected. A minimal lexical support check also rejects ideas
   with invented numbers, invented negation, or mostly non-source content
   words. If no idea survives: 422 `no_grounded_ideas` with per-idea reasons.
2. **Evidence:** each evidence `source_span` must be verbatim in the source and
   each `learner_span` verbatim in the answer (ordered `...` segments are
   allowed, as in the contract example), otherwise it is dropped. A `correct` or
   `partial` label with no surviving evidence becomes `vague` /
   `prompt_specifics` (score ≤ 0.45) with flag `ungrounded_positive_downgraded`.
3. **Contradiction:** `contradiction` ⇒ score ≤ 0.15 and action
   `correct_misconception_then_cue` (never `accept`). An idea-level
   `contradiction: true` overrides a positive label.
4. **ASR:** `transcript_meta.origin = asr` with `confirmed = false` always
   returns `asr_uncertain`, score `null`, clue `null`, `confirm_transcript`,
   without calling (or sending anything to) the scoring provider.
5. **Score is `null` iff label is `asr_uncertain`** (likewise `clue_level`).
   A provider that omits a score for any other label gets a 502, not a guess.
   Actions are normalised to ones coherent with the label.

The response model re-asserts these invariants, so a post-processing bug fails
closed. What this layer **cannot** do: detect a contradiction that a model
labels `correct` with plausible verbatim evidence (a test documents this). That
is exactly why the A001 gate and shadow-only operation are mandatory.

## Prompt-injection resistance

Reading text, key ideas and answers are untrusted data. System instructions
are fixed constants; user content travels only as string values inside one
JSON payload (`untrusted_*` fields) built with `json.dumps` (ASCII-only,
sorted keys, `<`/`>` escaped so role tags never appear literally). The service
never fetches URLs found in text and only ever contacts the configured base URL.
Tests show injection strings never reach the system message and do not change
the fake provider's result.

## Privacy logging

Logs contain only method, path (no query string), status, duration and fixed
outcome codes. A redacting filter on every service logger plus uvicorn/httpx
loggers removes bearer tokens, `sk-` keys, `api_key=`-style values, URL
credentials, configured key values, long opaque tokens, and any text submitted
in the current request (registered via `sensitive_scope`). Tracebacks are
suppressed (they can embed input). Tests use `caplog` to prove submitted text,
audio, filenames and keys never appear.

## Tests

`.venv/bin/python -m pytest -q` runs the whole suite offline. An autouse
fixture blocks real sockets and httpx transports, so any attempted network call
fails the test. Remote adapters are exercised only with `httpx.MockTransport`.

## Known limitations

- No real transcription adapter is included; `/v1/transcribe` returns 503
  outside fake mode.
- The entailment "verifier" is a lexical support heuristic, not a semantic
  verifier. A real deployment should add a second model-based verification
  pass and must pass A001 before any score affects scheduling.
- Starlette 1.x prefers the separate `httpx2` package for its TestClient; this
  service deliberately uses the pinned `httpx` and silences only that warning
  in `pyproject.toml`.
