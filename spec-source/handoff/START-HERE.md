# Recall for Dave — Claude Code Cloud hand-off

Date: 8 November 2026.

This bundle contains:
- `Read-Remember-Codex-Pack-v0.2.zip` — the exact original source specification (SHA-256: d04965731c857d791468e67214adaf5737d191889edb0f3b255153e345921980).
- `Recall_Dave_Claude_Code_Cloud_Master_Build_Prompt.md` — full, executable autonomy/build/test/improve/release instructions.

## Setup
1. Create a **private GitHub repository** with a README so it has a default branch. Suggested name: `recall-dave`.
2. Upload **this entire hand-off ZIP** to the repository (do not publish the repository).
3. Go to https://claude.ai/code, connect GitHub if necessary, select your private repository, choose **Code** mode, and paste the launcher below.
4. Claude Code Cloud will clone the repository, unpack the archive, read the master specification and source pack, build and test in its cloud VM, and push its changes to a branch / prepare a PR when permitted.
5. Review the PR. Check `docs/RELEASE-REPORT.md` for what has and has not been actually tested, then follow the README for the Safari Home Screen PWA route or the EAS native iOS route.

## Paste into Claude Code Cloud

Build the full Recall / Read & Remember iPhone app for my friend David, using the hand-off archive `Recall_Dave_Claude_Cloud_Handoff.zip` in this GitHub repository. Extract it into a temporary or working folder, locate `Recall_Dave_Claude_Code_Cloud_Master_Build_Prompt.md`, and execute that entire document as the implementation instructions. Also read and preserve the original `Read-Remember-Codex-Pack-v0.2.zip` and especially its A001 harness. This is a **Code** task, not a planning task: write the working application, repeatedly run tests, fix defects, perform three improvement passes, commit and push progress after each milestone, and create a pull request if authorised. Save honest release evidence in `docs/RELEASE-REPORT.md`, and do not claim a native iPhone build, live deployment or physical-device testing without evidence. Never buy or enable paid services. Do not stop after making a plan.

## Important
- This task cannot automatically purchase Apple Developer membership, sign iOS builds without credentials, or test an actual physical iPhone unless such access is available.
- The PWA route requires an HTTPS host for Dave to open and install the app; a built ZIP alone is not a live website.
- Any unfinished work must remain committed to Git so that another agent can continue after the subscription ends.
