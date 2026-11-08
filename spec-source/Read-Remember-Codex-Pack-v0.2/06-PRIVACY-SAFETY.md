# Privacy and Safety Rules

## Data minimisation
The app does not need David's diagnosis.

Store only what is useful for learning:
- reading content chosen by the user;
- extracted source-grounded ideas;
- confirmed answer transcript;
- recall result;
- clue usage;
- review history;
- preferences.

## Audio
Default:
- microphone is opt-in per answer;
- temporary audio only;
- delete after transcription/confirmation;
- do not log or upload elsewhere.

## AI disclosure
The app must make clear:
- whether AI processing is on-device/local or sent to a configured service;
- what text/audio is sent;
- whether it is retained by the configured provider.

## Clinical boundary
Never infer:
- schizophrenia symptoms;
- relapse;
- medication effectiveness;
- diagnosis;
- mental capacity;
- intelligence.

Performance observations stay descriptive.

## User control
Provide:
- view stored data;
- export data;
- delete reading;
- delete all;
- disable microphone;
- use typing only.

## Security
- no secrets in mobile source;
- SecureStore for small device tokens;
- server environment variables for provider keys;
- input length limits;
- JSON schema validation;
- prompt-injection resistance;
- no arbitrary URL fetching from pasted text;
- logs must exclude raw audio and secrets.
