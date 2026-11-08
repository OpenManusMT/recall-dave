# Security and privacy

Recall is a reading-practice aid. It is **not** a medical device, diagnostic tool or monitoring system. It stores no diagnosis or health information, and infers nothing clinical. Measures describe reading practice only.

## Data inventory (what is stored, where)

Everything is stored **on the device only**: IndexedDB in the web app, SQLite in the native app. There is no account, no server-side storage, no analytics, no advertising and no third-party SDK.

| Record | Contents | Why |
|---|---|---|
| Settings | Text size, theme, contrast, motion, font, input preference, part size, question toggle, last backup date | Comfort and adaptation |
| Readings | Title and text of bundled or pasted readings | To read and review them |
| Parts (chunks) | Text of each part, its key points (with exact supporting sentences) and questions | Stable review history even if bundled content changes |
| Memory states | Per key point: fixed-step schedule (used), FSRS-style shadow values (not used), review counts, clue history | Review scheduling |
| Answers (attempts) | The learner’s own words, the hint level needed for each point, the question result, timings | Feedback and progress |
| Review log | Each review: grade, proposed and actual dates (authoritative and shadow) | Auditable scheduling |
| Sessions, strategy use | Start/end, draft text for resume, use of read-aloud/explain/show text/too much | Resume and insights |

Not stored: name, email, contact details, location, diagnosis, medication, audio, device identifiers.

## User control

- **Export backup** (JSON file the user keeps), **Import backup** (validated, migrated, then replaces data atomically after confirmation), **Delete one reading** (removes its text, points, answers and history), **Delete all data** (confirmation required).
- **What is stored** (Settings) lists counts of every record type.

## Network and third parties

- The PWA makes **no network requests to other sites**. A Content-Security-Policy restricts scripts, styles, fonts, images and connections to the app’s own origin. `form-action 'none'`, `object-src 'none'`. The e2e suite asserts that no request leaves `localhost` during a full offline session.
- System fonts only; no web fonts or CDNs.
- Read-aloud uses the device’s built-in speech voices (`speechSynthesis` / `expo-speech`).
- Voice input is the iPhone keyboard’s dictation, provided by Apple under the user’s own iOS settings. Recall itself never records audio and declares no microphone permission.

## Untrusted input

- Pasted reading text is **data**: it is sanitised (control and bidirectional-override characters removed, 20,000-character limit) and rendered as plain text by React. Links are not linked, scripts and HTML are not interpreted, and nothing in the text is ever fetched or followed. This is tested end to end with a hostile sample (`<script>`, `onerror`, “ignore previous instructions”, URLs).
- Backup files are untrusted: size-limited (25 MB), schema-validated record by record (zod), migrated from older versions, and unknown fields are stripped. Settings are clamped to safe ranges, and orphaned records are dropped with a warning. A damaged file changes nothing.
- No AI model is used by the app. The optional server (`services/api`) treats reading and answer text strictly as JSON data inside fixed instructions, and verifies every source span verbatim. It forces contradiction and ASR safety rules on any provider’s output, and is disabled for remote providers by default.

## Secrets

- No secrets exist in the apps. Provider keys for the optional server are read from server environment variables only (`services/api/.env.example` lists names, never values).
- `npm run verify` scans every tracked file for key patterns, private keys, databases and audio files, and scans the built PWA for third-party URLs and key-like strings.

## Threat model (summary)

| Threat | Mitigation | Residual risk |
|---|---|---|
| Someone with the unlocked phone reads the learner’s answers | Data is on-device only, behind the phone’s own lock | As for any app on an unlocked phone |
| Browser clears website data (storage eviction) | Prompt to install to the Home Screen; persistent-storage request; backup reminder; export/import | Data loss if no backup exists |
| Malicious pasted text (XSS, prompt injection) | Plain-text rendering, CSP, sanitisation, no AI in the app | — |
| Malicious or corrupted backup file | Size limit, strict validation, atomic replace after confirmation | — |
| Interrupted writes / crashes mid-save | Atomic transactions (IndexedDB and SQLite), idempotent attempt ids | — |
| Supply chain (npm dependencies) | Lockfiles, `npm audit` in verify (0 high/critical in production deps at release), small dependency set | Future advisories |
| Misleading “AI marking” | Automatic scoring disabled (failed the A001 gate); no fake percentages | — |
| Advanced scheduler changing real reviews unsafely | Shadow mode only; `schedulerMode` is forced to `shadow` | — |
| Clinical misinterpretation of progress | Descriptive measures, practised vs fresh separated, explicit non-clinical wording | Readers may still over-interpret |

## Repository visibility (important)

At the time of this release the GitHub repository is **public**, although the hand-off note asked for a private repository. The preserved original specification pack (`spec-source/`) and the hand-off documents contain names and context about the intended user that should not be public. Only the repository owner can change this (Settings → General → Danger Zone → Change visibility). Making it private does not remove copies that may already have been fetched; removing the files from history would need a deliberate history rewrite. See the hand-off summary.
