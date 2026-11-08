# Recall for iPhone (Expo)

The native iPhone app for **Recall**, the calm, local-first reading-and-remembering aid. It is the same product as the PWA in
`apps/web`: the same screens, the same steps and the same UK-English wording. It runs the same tested domain logic from
`packages/core` (chunking, clue ladder, scheduling, adaptation, progress, backup) and the same bundled passages from
`packages/content`. None of that logic is copied here: this app only adds the iPhone user interface and storage.

- Expo SDK **58** (`expo@~58.0.23`), Expo Router, TypeScript
- React **19.3.0**, React Native **0.88.1** (the versions pinned by SDK 58)
- Storage: `expo-sqlite`, one on-device file called `recall.db`, through the shared `SqliteStore` and its migrations
- Read-aloud: `expo-speech` (Apple's on-device voices)
- Backup: `expo-file-system` + `expo-sharing` (export through the share sheet) and `expo-document-picker` (import)
- No account, no network calls, no analytics, no AI, no microphone access. To answer by voice, Dave uses the **dictation
  key on the iPhone keyboard**. The words appear in the text box, so he can check them before continuing. Recall never
  records audio.

## Status: what has and has not been checked

Checked on a Linux machine (details and exact output in [`VERIFICATION.txt`](./VERIFICATION.txt)):

- `npm ci` installs from the committed lockfile.
- `npx tsc --noEmit` passes. This also type-checks the shared sources in `packages/core` and `packages/content`.
- `npx expo config --type public` evaluates the app config.
- `npx expo export --platform ios` bundles the whole app for iOS with Metro, including the TypeScript sources from
  `packages/`, and compiles it to Hermes bytecode. This also worked in a fresh copy with no `node_modules` at the repo
  root, which is the situation on a new Windows PC.
- `npm test` passes: Jest tests for the SQLite adapter, run against a real SQLite database, and for the colour and text
  tokens.
- `npx expo-doctor` passed 18 of 20 checks. The other 2 could not run, because the build machine cannot reach Expo's API
  or React Native Directory. They are **not** verified.

**Not done or not verified:**

- No EAS build has been run. The app is **not signed**.
- The app has **not been run on a physical iPhone or a simulator**. Nobody has looked at the screens running, and
  VoiceOver has not been tested on a device.
- Expo Go compatibility has not been checked (see below).
- These Windows steps have not been run on Windows.

Before giving the app to Dave, run through the whole journey on a real iPhone: onboarding, a session, closing the app
part-way through and continuing, reviews, export and import of a backup, and Delete all data. Do this with VoiceOver on and
with large text.

## How it fits in the repository

```
packages/core       shared, tested domain logic (Vitest)
packages/content    bundled passages and fresh-text probes
apps/web            the PWA (an npm workspace of the repo root)
apps/mobile         this app: a STANDALONE npm project (not a root workspace)
```

`apps/mobile` is deliberately **not** in the root `workspaces`. If it were, React and Metro could be hoisted next to the web
app's copies and conflict with them. It has its own `package.json` and `package-lock.json`. It uses the shared code through
`"@recall/core": "file:../../packages/core"` and `"@recall/content": "file:../../packages/content"`. npm links these
folders: symlinks on macOS and Linux, junctions on Windows.

- `metro.config.js` adds `../../packages` to `watchFolders`, so Metro bundles the TypeScript sources there. It also resolves
  their bare imports (`zod`, `@recall/core`) from `apps/mobile/node_modules`, never from a repo-root `node_modules`.
- `tsconfig.json` uses `paths` to do the same for the type checker. `app.json` sets `experiments.tsconfigPaths: false`, so
  these paths do not change Metro's resolution.
- `zod` (4.x, the same major version as `packages/core`) is a direct dependency here, so it is always present.

Code layout:

```
src/app/                 Expo Router routes
  _layout.tsx            root stack, theme, providers
  (tabs)/                Home, Read (library), Reviews, Progress, Settings
  welcome.tsx            onboarding (skippable)
  add.tsx                paste your own reading
  read/[passageId].tsx   library passage   (?mode=read for "Help me read this")
  doc/[documentId].tsx   pasted reading    (?mode=read)
  probe/[passageId].tsx  fresh-text check
  review-run.tsx         retrieval-first reviews (?then=read continues with something new)
  finish/[sessionId].tsx session summary
src/screens/             screen components (ports of apps/web/src/screens)
src/components/ChunkFlow.tsx   read, hide, recall, question, per-point clue ladder, save (port of the web ChunkFlow)
src/components/ui.tsx    accessible building blocks (48pt+ targets, roles, labels, states)
src/lib/sqlite-driver.ts expo-sqlite to SqlDriver adapter (queues transactions; tested)
src/lib/database.ts      opens recall.db and runs the shared migrations
src/lib/theme.ts         the web app's colour tokens (light, dark, high contrast) and type scale
```

## Privacy

- Everything is stored in `recall.db`, inside Recall's private app storage on the iPhone. If iCloud Backup or computer
  backups are switched on, the iPhone's own backups can include it, as they do for other apps.
- The app makes no network requests. There is no analytics or tracking SDK, and the privacy manifest declares no data
  collection and no tracking.
- Backup export writes a JSON file to the app's temporary folder, opens the iOS share sheet and deletes the temporary file
  afterwards. Import reads the file Dave picks and validates all of it (`parseBackup`). Nothing changes until he confirms.
  The copy the picker made is then deleted.
- **Permissions:** the app asks for none. It has no microphone, camera, photos, location, contacts or tracking usage
  strings. The generated `Info.plist` does contain `NSLocalNetworkUsageDescription` and `NSBonjourServices`. These are added
  by `expo-dev-client` so that a **development build** can find the Metro server on Marco's PC. They are not used by the
  app's own code.
- `ios.config.usesNonExemptEncryption` is `false` (`ITSAppUsesNonExemptEncryption`). The app uses no encryption of its own.
- The Expo command-line tool on the developer's PC (not the app) sends anonymous usage data to Expo by default. To turn it
  off, run `$env:EXPO_NO_TELEMETRY = "1"` in PowerShell before running `npx expo …`.

## Placeholders to change before the first EAS build

| What | Where | Now | Change to |
| --- | --- | --- | --- |
| Bundle identifier | `app.json` → `expo.ios.bundleIdentifier` | `com.example.recall.dave` (**placeholder**) | a reverse-DNS ID that Marco controls, e.g. `uk.co.<marco-domain>.recall`. It must be unique and cannot be changed after the App Store Connect record exists. |
| EAS project ID | `app.json` → `expo.extra.eas.projectId` | not set | written by `eas init`; commit it (it is not a secret) |
| App Store Connect app ID | `eas.json` → `submit.production` | `{}` | optional: `{ "ascAppId": "1234567890" }`, the numeric Apple ID of the app shown in App Store Connect under App Information. If it is left out, `eas submit` asks for what it needs interactively. JSON has no comments, so the placeholder is an empty object. |

No secrets belong in this folder. EAS stores Apple credentials on Expo's servers. The `.gitignore` excludes `.env`,
`credentials.json`, `*.p8`, `*.p12`, `*.mobileprovision` and similar files.

### `eas.json` profiles

| Profile | Use |
| --- | --- |
| `development` | development build (`expo-dev-client`) for Dave's or Marco's registered iPhone: `developmentClient: true`, `distribution: internal`, `ios.simulator: false` |
| `simulator` | development build for the iOS Simulator. This needs a Mac, so it is only here for completeness. |
| `preview` | internal (ad hoc) release-like build for registered devices, without the dev menu |
| `production` | App Store / TestFlight build. `autoIncrement: true` raises the build number on every build. |

`cli.appVersionSource` is **`remote`**. EAS keeps the iOS build number on its servers and increases it for each production
build, so Marco never has to edit and commit `buildNumber`. This suits building from a Windows PC with no Mac. On the first
build, EAS starts from the local value (`"buildNumber": "1"` in `app.json`). After that, the `buildNumber` in `app.json` is
ignored for EAS builds. The user-facing version (`"version": "1.0.0"`) still comes from `app.json`; change it there for a
new release.

## Windows 11 steps for Marco (PowerShell)

### 1. One-time tools

```powershell
# Node.js LTS (Expo SDK 58 supports Node ^22.13, ^24.3 or >= 26). Either use winget or the installer from nodejs.org.
winget install OpenJS.NodeJS.LTS
# Close and reopen PowerShell, then check:
node -v
npm -v
git --version
```

If PowerShell says *"running scripts is disabled on this system"* when you run `npm` or `npx`, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 2. Install and run the JavaScript side

```powershell
cd path\to\recall-dave\apps\mobile
npm ci                 # installs exactly what package-lock.json lists (a few minutes)
npm run typecheck      # tsc --noEmit
npm test               # Jest tests
npx expo start         # starts Metro and shows a QR code
```

You do **not** need to run `npm ci` at the repo root for the iPhone app. You only need that for the web app.

`npm run ios` (`expo start --ios`) opens the iOS Simulator, which **only exists on a Mac**, so it does nothing useful on
Windows. Use `npx expo start` and a real iPhone instead.

Windows Firewall may ask whether Node.js may use the network. Allow it on **private** networks, so the iPhone on the same
Wi-Fi can reach Metro. If the PC and iPhone cannot see each other (for example on guest Wi-Fi), use
`npx expo start --tunnel`.

### 3. Quick try with Expo Go (optional, must be verified)

Every native module this app uses is part of the Expo SDK and included in Expo Go: `expo-sqlite`, `expo-speech`,
`expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-router`, `react-native-screens`,
`react-native-safe-area-context`, `react-native-svg`, `expo-status-bar` and `expo-splash-screen`. It has no custom native
code. So **Expo Go on the iPhone should be able to run it for quick testing, but only if the Expo Go version in the App
Store supports SDK 58.** Expo Go supports one SDK at a time, normally the latest. This has not been tested.

Because `expo-dev-client` is installed, `npx expo start` targets a development build by default. To use Expo Go instead:

```powershell
npx expo start --go
```

Then scan the QR code with the iPhone's Camera app. If Expo Go reports that the project's SDK is not supported, use a
development build (next step).

### 4. Development build on the iPhone (EAS, cloud macOS, no Mac needed)

Prerequisites. These are Marco's decisions, so nothing is bought or signed up for automatically:

- an **Apple Developer Program** membership (paid yearly, currently listed by Apple at USD 99 a year). It is needed to install
  signed builds on a device and for TestFlight.
- a free **Expo account** (expo.dev). EAS Build's free plan has a monthly build allowance; see expo.dev/pricing.

```powershell
npm install -g eas-cli
eas login                       # Expo account
# Change expo.ios.bundleIdentifier in app.json first (see "Placeholders").
eas init                        # creates the EAS project and writes extra.eas.projectId into app.json; commit it
eas device:create               # makes a link/QR code; open it on the iPhone to register its UDID
eas build --platform ios --profile development
```

During the first `eas build`, sign in with the Apple ID of the developer account when asked, and let **EAS manage the
credentials**. EAS creates and stores the distribution certificate and provisioning profile. Nothing is saved in the repo.

When the build finishes, open the install link or QR code on the registered iPhone. On iOS 16 or later, turn on **Settings ›
Privacy & Security › Developer Mode** (the iPhone restarts). Then start Metro on the PC with `npx expo start`, open the
Recall development build on the iPhone, and pick the server it finds (same Wi-Fi), or scan the QR code.

EAS uploads the whole git repository (minus `.gitignore`d files) and builds in `apps/mobile`, so the `file:../../packages/*`
dependencies are included. Commit your changes before building. In the first build log, check that `npm ci` runs in
`apps/mobile`.

### 5. TestFlight

```powershell
eas build --platform ios --profile production
eas submit --platform ios       # uploads the latest production build to App Store Connect
```

`eas submit` can create the App Store Connect app record and asks for anything that is missing. After Apple has processed
the build, which usually takes a few minutes to an hour, open App Store Connect › the app › **TestFlight**:

- Internal testers (people in Marco's App Store Connect team) can install at once.
- External testers, for example Dave invited by email, need a short **Beta App Review** first.

Dave installs **TestFlight** from the App Store and accepts the invitation.

Before submitting, check that App Store Connect's privacy answers match the app: **no data collected** and no tracking. Also
check that the privacy manifest in `app.json` (`ios.privacyManifests`) still matches the SDKs in use.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm start` | `expo start` (Metro dev server) |
| `npm run ios` | `expo start --ios` (needs macOS with the iOS Simulator) |
| `npm run typecheck` | `tsc --noEmit` (app and shared packages) |
| `npm test` | Jest (`jest-expo/ios` preset) |
| `npm run doctor` | `npx expo-doctor` (needs internet access to Expo's API for all checks) |
| `npm run export:ios` | bundles the iOS JavaScript into `dist-ios/` (git-ignored). This is a good offline check that everything compiles. |
| `npm run config` | prints the evaluated public app config |

To add or upgrade a native package, use `npx expo install <package>` so that the version matches SDK 58. The domain tests
for scoring, scheduling, chunking and backup live in `packages/core` and run from the repo root with Vitest.
