# Verification summary

- Command: `npm run verify -- --full`
- When: 2026-11-08T15:07:03.530Z
- Commit: 2b85799 (working tree may contain uncommitted changes when run locally)
- Machine: linux x64, Node v22.23.4

| Step | Status | Detail |
|---|---|---|
| npm ci (clean install from lockfile) | PASS | added 231 packages in 4s (3.6s) |
| Dependency audit (production deps, high+) | PASS | found 0 vulnerabilities |
| Format (prettier --check) | PASS | All matched files use Prettier code style! (2.3s) |
| Lint (eslint) | PASS | no problems (2.3s) |
| TypeScript (core, content, web) | PASS | no type errors (5.6s) |
| Unit tests (core, content, storage, backup, scheduler, scorer) | PASS | Tests  115 passed (115) (8.1s) |
| API tests (services/api, fake providers, no network) | PASS | 144 passed in 1.19s |
|   ↳ Candidate scorer production gate (A001) | FAIL (expected, recorded) | label+action 0.49, safety failures 105; holdout gate FAIL. Scorer stays DISABLED; scheduler stays shadow-only. |
| A001 harness integrity + candidate 5×100 runs | PASS | original unit tests, integrity, oracle, baseline and 5-run evaluations executed |
| PWA production build | PASS | apps/web/dist built (3.4s) |
| PWA build contents | PASS | precache 12 files, cache d1981640c7b6b19a, JS 541 KB |
| Playwright e2e + PWA offline + axe (Chromium 375×667, 390×844) | PASS | 87 passed, 3 skipped (screenshots) |
| Playwright WebKit (Safari engine) project | NOT_RUN | no Playwright WebKit build on this machine; run `npx playwright install webkit` then `npm run e2e` where permitted. WebKit ≠ iOS Safari. |
| Expo app TypeScript | PASS | no type errors (3.4s) |
| Expo config evaluates (expo config --type public) | PASS | config OK (0.4s) |
| Expo app unit tests (jest) | PASS | Time:        3.789 s, estimated 4 s / Ran all test suites. (4.2s) |
| Expo iOS JS bundle (expo export --platform ios) | PASS | Exported: dist-ios (11.9s) |
| EAS iOS build / signing / TestFlight | BLOCKED_EXTERNAL | IOS_SIGNING_BLOCKED_EXTERNAL: needs Expo account + Apple Developer membership |
| Physical iPhone test | BLOCKED_EXTERNAL | PHYSICAL_IPHONE_NOT_TESTED: see docs/IPHONE-INSTALL-AND-TEST.md |
| No secrets, recordings or databases in tracked files | PASS | 322 tracked files scanned |
| Built PWA makes no third-party requests and contains no keys | PASS | 13 built files scanned |

**All executed verification steps passed.** Informational rows record known, external or expected states.
