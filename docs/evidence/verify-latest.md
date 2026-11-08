# Verification summary

- Command: `npm run verify`
- When: 2026-11-08T14:08:08.330Z
- Commit: 9c026a7 (working tree may contain uncommitted changes when run locally)
- Machine: linux x64, Node v22.23.4

| Step | Status | Detail |
|---|---|---|
| Lockfile consistency (npm ls) | PASS | installed tree matches package-lock.json (0.5s) |
| Dependency audit (production deps, high+) | PASS | found 0 vulnerabilities |
| Format (prettier --check) | PASS | All matched files use Prettier code style! (2.7s) |
| Lint (eslint) | PASS | no problems (2.5s) |
| TypeScript (core, content, web) | PASS | no type errors (5.9s) |
| Unit tests (core, content, storage, backup, scheduler, scorer) | FAIL | - the error was thrown while Vitest was running this test, or / - the error was thrown after the test completed, and this was the most recent test at that point. / ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ (1.5s) |
| API tests (services/api, fake providers, no network) | PASS | 144 passed in 1.15s |
|   ↳ Candidate scorer production gate (A001) | FAIL (expected, recorded) | label+action 0.49, safety failures 105; holdout gate FAIL. Scorer stays DISABLED; scheduler stays shadow-only. |
| A001 harness integrity + candidate 5×100 runs | PASS | original unit tests, integrity, oracle, baseline and 5-run evaluations executed |
| PWA production build | PASS | apps/web/dist built (3.3s) |
| PWA build contents | PASS | precache 11 files, cache eea3e63cefd43513, JS 535 KB |
| Playwright e2e + PWA offline + axe (Chromium 375×667, 390×844) | PASS | 62 passed, 2 skipped (screenshots) |
| Playwright WebKit (Safari engine) project | NOT_RUN | no Playwright WebKit build on this machine; run `npx playwright install webkit` then `npm run e2e` where permitted. WebKit ≠ iOS Safari. |
| Expo app TypeScript | FAIL |   Type 'RefObject<(((props: Omit<ScrollViewProps, "ref"> & { ref?: Ref<ScrollViewInstance> / undefined; }) => ReactNode) & Readonly<...>) / null>' is not assignable to type 'RefObject<ScrollViewInstance / null>'. /     Type '(((props: Omit<ScrollViewProps, "ref"> & { ref?: Ref<ScrollViewInstance> / undefined; }) => ReactNode) & Readonly<{ ...; }>) / null' is not assignable to type 'ScrollViewInstance / null'. /       Type '((props: Omit<ScrollViewProps, "ref"> & { ref?: Ref<ScrollViewInstance> / undefined; }) => ReactNode) & Readonly<{ Context: Context<...>; }>' is not assignable to type 'ScrollViewInstance / null'. (3.4s) |
| Expo config evaluates (expo config --type public) | PASS | config OK (0.6s) |
| Expo app unit tests (jest) | FAIL |   testPathIgnorePatterns: /node_modules/ - 39 matches /   testRegex:  - 0 matches / Pattern:  - 0 matches (0.6s) |
| EAS iOS build / signing / TestFlight | BLOCKED_EXTERNAL | IOS_SIGNING_BLOCKED_EXTERNAL: needs Expo account + Apple Developer membership |
| Physical iPhone test | BLOCKED_EXTERNAL | PHYSICAL_IPHONE_NOT_TESTED: see docs/IPHONE-INSTALL-AND-TEST.md |
| No secrets, recordings or databases in tracked files | PASS | 250 tracked files scanned |
| Built PWA makes no third-party requests and contains no keys | PASS | 12 built files scanned |

**3 step(s) FAILED.**
