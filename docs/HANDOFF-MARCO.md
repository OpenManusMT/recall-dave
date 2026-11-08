# Hand-off summary for Marco

**Branch:** `claude/cool-allen-bu6jx0` in `OpenManusMT/recall-dave`. It is the repository's only branch, so it is also the default branch.
**Pull request:** not created. A pull request needs a separate base branch (for example `main`), and none exists because the repository was empty when work started. See “Smallest remaining actions”.
**Final commit and full evidence:** see `docs/RELEASE-REPORT.md`.

## Status in one line each

- **Web app (PWA) for Dave's iPhone:** built and tested in browsers, works offline → **BUILT_NOT_DEPLOYED**. It needs an https address before Dave can install it.
- **Physical iPhone:** **PHYSICAL_IPHONE_NOT_TESTED**. Use the 10-minute script in `docs/IPHONE-INSTALL-AND-TEST.md`.
- **Native iPhone app:** project prepared and its iOS JavaScript bundle builds. **IOS_SIGNING_BLOCKED_EXTERNAL**: it needs an Apple Developer membership and an Expo account.
- **Automatic marking of answers:** switched off. It was tested against the original A001 gate and failed, so Dave checks his own answers against the main points, with hints.

## ⚠️ First, please check this

The GitHub repository is **public**. The hand-off note asked for a private one. The preserved original specification (`spec-source/`) and the hand-off documents mention Dave by name together with background that should stay private. Please:
1. Make the repository private: GitHub → Settings → General → Danger Zone → Change visibility. Note that GitHub Pages on a private repository needs a paid plan, so then use “Option 2” in `docs/DEPLOYMENT.md`.
2. If you want those files removed from the published history as well, ask a developer or a later Claude session to rewrite the branch history to drop `spec-source/`. This could not be done without your approval because it rewrites published history.

## Installing on Dave's iPhone (once the site is hosted)

1. Host it (5 minutes). Either:
   - **GitHub Pages** (public site): repository Settings → Pages → Source “GitHub Actions”, then Actions → “deploy-pwa-to-pages” → Run workflow; or
   - **Any static host**: upload the contents of the `recall-pwa` folder from `release/recall-pwa-1.0.0.zip` (for example Netlify Drop).
2. On Dave's iPhone, open the https link in **Safari** → **Share** → **Add to Home Screen** → **Add**.
3. Open Recall from the new icon once while online. After that it works without internet.
4. Every few weeks: Settings → **Export backup** → Save to Files.

## 10-minute test for Dave and you

The full checklist, with boxes to tick, is in `docs/IPHONE-INSTALL-AND-TEST.md`. In short:
- Install from Safari.
- Start a session, read, hide, write (also try the keyboard microphone), check the points with hints, and finish.
- Close and reopen Recall: progress is still there.
- Aeroplane mode: Recall still opens and works.
- Export a backup.
- With VoiceOver, check the buttons make sense.
- The next day: the points come back under Reviews.

## Keeping the project after the Claude subscription ends

Everything is in Git: source, tests, evidence, documentation and the built ZIP. To continue later:
1. `git clone https://github.com/OpenManusMT/recall-dave.git` then `git checkout claude/cool-allen-bu6jx0`.
2. Install Node.js 22 LTS. Run `npm ci`, then `npm run verify` (and see `README.md`).
3. Any developer, or a future AI coding session, should start with `CLAUDE.md`, then `docs/EXECUTION-STATE.md`.
4. Optionally download a copy now: GitHub → Code → Download ZIP.

## Smallest remaining actions (only you can do these)

1. Decide on repository visibility (see above).
2. Approve and host the PWA (one workflow click, or one upload).
3. Run the 10-minute iPhone checklist with Dave and note the results.
4. Optional: create a `main` branch from the first commit (`9d93a2f`) on GitHub and open a pull request from `claude/cool-allen-bu6jx0`, or simply keep using this branch.
5. Optional, later: Apple Developer Program and Expo accounts for the native app (`apps/mobile/README.md`).
