# Windows Runbook

## Before Codex
1. Extract this ZIP to a normal Windows project folder.
2. Open that folder in the Codex app.
3. Paste `01-CODEX-ONE-SHOT-PROMPT.md`.
4. Let Codex create the repo beside/within the extracted pack as it documents.

## Expected local prerequisites
- Git
- Node.js LTS
- Python 3.11+ (recommended for API/harness)
- PowerShell
- optional Docker Desktop

## A001 proof
From `A001-harness`:
```powershell
python -m unittest discover -s tests -v
python evaluate.py --predictions oracle_predictions.jsonl
python evaluate.py --predictions baseline_predictions.jsonl
```

Expected:
- harness unit tests PASS;
- oracle PASS;
- lexical baseline FAIL.

## iPhone route
No Mac is required for the selected build path.

Once the app is ready and account credentials exist:
```powershell
npm install -g eas-cli
eas login
eas build --platform ios --profile development
```

For TestFlight:
```powershell
eas build --platform ios --profile production
eas submit --platform ios
```

## Do not commit
- API keys
- Apple credentials
- Expo access tokens
- audio recordings
- local user databases
