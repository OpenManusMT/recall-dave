# Read & Remember — START HERE

**Pack version:** 0.2  
**Purpose:** hand this folder or ZIP to Codex and ask it to continue the project autonomously.

## Current state

A001 is complete:
- 100 synthetic reading/recall cases.
- 5-run consistency gate.
- contradiction and speech-recognition safety checks.
- oracle PASS.
- deliberately weak lexical baseline FAIL.
- 7 harness unit tests PASS.

The next job is to build the product around this gate without letting an unvalidated AI scorer control a real person's review schedule.

## The hardware constraint

- David will use a physical **iPhone**.
- Marco develops on **Windows** and does **not** have a Mac.
- Therefore use a cross-platform Expo/React Native application and **EAS cloud builds for iOS**.
- Do not require local Xcode or a local iOS simulator.
- Test core logic on Windows and web first, then use an EAS development/TestFlight build on David's iPhone.
- A paid Apple Developer Program membership is required for normal TestFlight/App Store distribution. Missing Apple credentials must block only the distribution step, not local development or testing.

## First file for Codex

Paste the full contents of:

`01-CODEX-ONE-SHOT-PROMPT.md`

into Codex from the directory where you want the project created.

## Product boundary

This is an adaptive reading/comprehension/recall aid. It is **not**:
- a schizophrenia monitor;
- a diagnostic tool;
- a medication adviser;
- a clinical decision system.

The app should not need to store David's diagnosis at all.

## Guiding product principle

**Read a small meaningful chunk → recall it in your own words → receive the least help needed → retrieve it again at a useful interval → measure whether the skill transfers to fresh text.**
