# Verification summary

- Command: `npm run verify -- --quick`
- When: 2026-11-08T13:57:11.094Z
- Commit: 7d39ccb (working tree may contain uncommitted changes when run locally)
- Machine: linux x64, Node v22.23.4

| Step | Status | Detail |
|---|---|---|
| Lockfile consistency (npm ls) | PASS | installed tree matches package-lock.json (0.3s) |
| Dependency audit (production deps, high+) | PASS | found 0 vulnerabilities |
| Format (prettier --check) | FAIL | Checking formatting... / [warn] scripts/verify.mjs / [warn] Code style issues found in the above file. Run Prettier with --write to fix. (2.4s) |
| Lint (eslint) | PASS | no problems (2.4s) |
| TypeScript (core, content, web) | PASS | no type errors (5.9s) |
| Unit tests (core, content, storage, backup, scheduler, scorer) | PASS | Tests  95 passed (95) (1.4s) |
| API tests (services/api, fake providers, no network) | PASS | 144 passed in 1.27s |
| A001 harness + candidate scorer | NOT_RUN | --quick |
| PWA production build | PASS | apps/web/dist built (3.6s) |
| PWA build contents | PASS | precache 11 files, cache 7251edd521effafa, JS 532 KB |
| Playwright e2e + PWA + axe | NOT_RUN | --quick |
| Playwright WebKit (Safari engine) project | NOT_RUN | no Playwright WebKit build on this machine; run `npx playwright install webkit` then `npm run e2e` where permitted. WebKit ≠ iOS Safari. |
| Expo app TypeScript | FAIL | type: boolean / default: true / You can learn about all of the compiler options at https://aka.ms/tsc (0.3s) |
| Expo config evaluates (expo config --type public) | PASS | config OK (0.5s) |
| Expo app unit tests (jest) | FAIL |   testPathIgnorePatterns: /node_modules/ - 3 matches /   testRegex:  - 0 matches / Pattern:  - 0 matches (0.4s) |
| EAS iOS build / signing / TestFlight | BLOCKED_EXTERNAL | IOS_SIGNING_BLOCKED_EXTERNAL: needs Expo account + Apple Developer membership |
| Physical iPhone test | BLOCKED_EXTERNAL | PHYSICAL_IPHONE_NOT_TESTED: see docs/IPHONE-INSTALL-AND-TEST.md |
| No secrets, recordings or databases in tracked files | PASS | 223 tracked files scanned |
| Built PWA makes no third-party requests and contains no keys | PASS | 12 built files scanned |

**3 step(s) FAILED.**
