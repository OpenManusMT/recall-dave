# iPhone Development from Windows — No Mac Required

## Recommended route
Use Expo/React Native on Windows and Expo Application Services (EAS) for iOS cloud builds.

Official Expo documentation states that:
- EAS Build can create iOS binaries on Expo-hosted macOS runners.
- EAS Submit works on Windows.
- physical iOS testing can use a development build/TestFlight.
- a Mac is not required for the cloud build/submission route.

## Development phases

### Phase 1 — zero Apple dependency
On Windows:
- Node.js LTS.
- Git.
- create Expo project.
- implement core logic.
- run TypeScript/unit tests.
- run API tests.
- run web version for layout/flow.
- use mocked speech and AI providers.

No Apple account should block this work.

### Phase 2 — physical iPhone development
Requires Expo account and normally an Apple Developer Program membership for practical signed-device/TestFlight workflows.

Prepare:
- bundle identifier;
- app config;
- microphone permission;
- `eas.json`;
- development profile.

Typical cloud command:
`eas build --platform ios --profile development`

Register the test device if the chosen development-distribution path requires it.

### Phase 3 — TestFlight
Create production build:
`eas build --platform ios --profile production`

Submit from Windows:
`eas submit --platform ios`

Then use App Store Connect/TestFlight to invite David.

## Cost/credential boundary
Apple currently lists the Apple Developer Program at USD 99 per membership year (or local currency where available).

Do not purchase or enrol automatically.
Do not put Apple or Expo credentials in source control.

## Why not make Xcode a requirement?
There is no Mac. The project must therefore avoid a workflow that depends on:
- local Xcode;
- local iOS simulator;
- CocoaPods run locally on Windows for the iOS build.

EAS cloud takes responsibility for the macOS build environment.

## Audio
Use Expo's maintained audio recording API for capture. Keep typing available as a fallback.

For the first working version:
1. record only after the user taps the microphone;
2. stop explicitly;
3. send to the configured transcription provider;
4. if transcript confidence/meaning is uncertain, ask the learner to confirm;
5. delete the temporary audio by default.

## Useful official references
- https://docs.expo.dev/build/introduction/
- https://docs.expo.dev/submit/ios/
- https://docs.expo.dev/faq/
- https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/
- https://docs.expo.dev/versions/latest/sdk/audio/
- https://developer.apple.com/help/account/membership/program-enrollment
