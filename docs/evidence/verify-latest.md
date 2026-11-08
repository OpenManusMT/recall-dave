# Verification summary

- Command: `npm run verify`
- When: 2026-11-08T14:01:19.181Z
- Commit: d8debb0 (working tree may contain uncommitted changes when run locally)
- Machine: linux x64, Node v22.23.4

| Step | Status | Detail |
|---|---|---|
| Lockfile consistency (npm ls) | PASS | installed tree matches package-lock.json (0.4s) |
| Dependency audit (production deps, high+) | PASS | found 0 vulnerabilities |
| Format (prettier --check) | PASS | All matched files use Prettier code style! (2.3s) |
| Lint (eslint) | FAIL |   38:7  error    Unexpected control character(s) in regular expression: \x1b                          no-control-regex / ✖ 2 problems (1 error, 1 warning) /   0 errors and 1 warning potentially fixable with the `--fix` option. (2.2s) |
| TypeScript (core, content, web) | PASS | no type errors (5.8s) |
| Unit tests (core, content, storage, backup, scheduler, scorer) | PASS | Tests  95 passed (95) (1.4s) |
| API tests (services/api, fake providers, no network) | PASS | 144 passed in 1.31s |
|   ↳ Candidate scorer production gate (A001) | FAIL (expected, recorded) | label+action 0.49, safety failures 105; holdout gate FAIL. Scorer stays DISABLED; scheduler stays shadow-only. |
| A001 harness integrity + candidate 5×100 runs | PASS | original unit tests, integrity, oracle, baseline and 5-run evaluations executed |
| PWA production build | PASS | apps/web/dist built (3.3s) |
| PWA build contents | PASS | precache 11 files, cache a4e2e63e1345d79d, JS 532 KB |
| Playwright e2e + PWA offline + axe (Chromium 375×667, 390×844) | PASS | 56 passed, 2 skipped (screenshots) |
| Playwright WebKit (Safari engine) project | NOT_RUN | no Playwright WebKit build on this machine; run `npx playwright install webkit` then `npm run e2e` where permitted. WebKit ≠ iOS Safari. |
| Expo app TypeScript | FAIL | type: boolean / default: true / You can learn about all of the compiler options at https://aka.ms/tsc (0.3s) |
| Expo config evaluates (expo config --type public) | PASS | config OK (0.5s) |
| Expo app unit tests (jest) | FAIL |   testPathIgnorePatterns: /node_modules/ - 12 matches /   testRegex:  - 0 matches / Pattern:  - 0 matches (0.4s) |
| EAS iOS build / signing / TestFlight | BLOCKED_EXTERNAL | IOS_SIGNING_BLOCKED_EXTERNAL: needs Expo account + Apple Developer membership |
| Physical iPhone test | BLOCKED_EXTERNAL | PHYSICAL_IPHONE_NOT_TESTED: see docs/IPHONE-INSTALL-AND-TEST.md |
| No secrets, recordings or databases in tracked files | PASS | 248 tracked files scanned |
| Built PWA makes no third-party requests and contains no keys | PASS | 12 built files scanned |

**3 step(s) FAILED.**
