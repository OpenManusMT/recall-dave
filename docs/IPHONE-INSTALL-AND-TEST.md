# Recall on iPhone — install and 10-minute test

Status: **PHYSICAL_IPHONE_NOT_TESTED**. Everything below was prepared and tested in desktop Chromium at iPhone-sized screens. Nobody has yet run it on a real iPhone. Please run the checklist and note the results at the end of this file (or send them back to the developer).

There are two ways to get Recall onto an iPhone:

| Route | What you need | Status |
|---|---|---|
| **A. Web app (PWA) from Safari** — recommended now | The built site hosted at an **https://** address | Built and tested in browsers; **not yet hosted** (see `docs/DEPLOYMENT.md`) |
| **B. Native app via TestFlight** | Apple Developer Program membership (paid), Expo account, EAS cloud build | Project prepared; **not built or signed** (see `apps/mobile/README.md`) |

---

## A. Install the web app from Safari

1. Marco hosts the site (one click; see `docs/DEPLOYMENT.md`) and sends Dave the https link.
2. On the iPhone, open the link in **Safari**. (Other browsers on iPhone may not offer “Add to Home Screen” in the same way.)
3. Tap the **Share** button (square with an upward arrow).
4. Scroll down and tap **Add to Home Screen**, then **Add**.
5. Open **Recall** from the Home Screen icon (the blue book with a green bookmark). It opens full-screen, without Safari’s address bar.
6. Use it once while connected to the internet. After that first full load, it works with no internet connection (all 22 passages and the 6 fresh-text passages are stored on the phone).

### Keeping progress safe

- Progress is stored **only on the iPhone**, inside Recall. There is no account and nothing is uploaded.
- Apple can clear website data in some situations (for example, a website opened in Safari and not used for a long time, or clearing Safari history). The Home Screen version is the safer option.
- Every few weeks: **Settings → Export backup → Save to Files**. To restore: **Settings → Import backup**, then choose the file. Recall also shows a gentle reminder on Home.
- Deleting the Home Screen icon deletes Recall’s data on that phone. Export a backup first.

### Speaking instead of typing

Recall has no microphone button of its own. To speak an answer, tap the **microphone key on the iPhone keyboard** (Apple’s dictation). The words appear in the box, so Dave can check and correct them before tapping **Check my answer**. Dictation is provided by Apple and follows the iPhone’s own settings (Settings → General → Keyboard → Enable Dictation).

---

## 10-minute test script (Dave and Marco together)

Tick each line. If something fails, write down what happened, on which screen, and take a screenshot (side button + volume up).

**Setup (1 min)**
- [ ] 1. Recall installs from Safari with **Add to Home Screen**. The icon is clear and the name reads “Recall”.
- [ ] 2. Opening from the icon shows no Safari address bar. Nothing is hidden under the notch or the bottom home bar.

**First session (4 min)**
- [ ] 3. The welcome screens are easy to follow. **Skip and start** works.
- [ ] 4. **Text size**: pick “Very large” in Settings → the reading text is comfortable. Turning the phone sideways still shows everything without sideways scrolling.
- [ ] 5. Tap **Start a session** → a short part of “Why bread rises” appears. **Read aloud** speaks it in a UK voice (check the ring/silent switch is not on silent).
- [ ] 6. **Explain this part** shows the main points with the matching sentences from the text.
- [ ] 7. **I’ve read it — hide the text**. Type a few words. Then try the **keyboard microphone** for a second sentence and check the words appear and can be edited.
- [ ] 8. With the keyboard open, the **Check my answer** button can still be reached (tap **Done** on the keyboard if it is covered — note whether it was).
- [ ] 9. Answer the quick question. Check each point: try **Yes, I wrote about it**, then on the second point **No … give me a hint** → **Another hint** → **Show me the sentence**. The wording feels kind, not like a test.
- [ ] 10. **Finish for now** shows a calm summary.

**Persistence and offline (3 min)**
- [ ] 11. Swipe Recall away completely (app switcher), reopen it → the session summary/progress is still there and Home says “Next review tomorrow”.
- [ ] 12. Turn on **Aeroplane mode**. Reopen Recall from the icon → it opens. Open a different passage from **Read** and finish one part. Turn Aeroplane mode off.
- [ ] 13. Start reading, type half an answer, close Recall, reopen → **Continue where you left off** brings back the typed words.

**Data and accessibility (2 min)**
- [ ] 14. **Settings → Export backup** → “Save to Files” works and a `recall-backup-….json` file appears in Files.
- [ ] 15. With **VoiceOver** on (Settings → Accessibility → VoiceOver, or triple-click the side button if set up): swipe through Home and a reading step. Every button is read out with a sensible name, in a sensible order, and the step heading is announced after moving on.
- [ ] 16. (Optional, at the end) **Settings → Delete all data** asks for confirmation and then returns to the welcome screen.

**Next day (1 min, the following day)**
- [ ] 17. Home shows points ready to review. **Do reviews only** asks for recall **before** showing the answer.

### Manual accessibility checklist (cannot be proven by automated browser tests)

- VoiceOver reading order and labels on every screen (Home, Read, reading/recall/question/check steps, Reviews, Progress, Settings, dialogs).
- Larger iOS text: Recall uses its own **Text size** setting; also try Safari’s “aA” page zoom if needed.
- Bold Text / Increase Contrast / Reduce Motion (iOS Settings → Accessibility): Recall’s own **High contrast** and **Reduce motion** settings should be used together with them.
- Standalone mode: safe areas around the notch / Dynamic Island and the home indicator; landscape.
- On-screen keyboard: nothing important is permanently hidden.

### Results (fill in)

| Date | iPhone model / iOS version | Steps passed | Problems seen |
|---|---|---|---|
| | | | |

---

## B. Native app (later, optional)

See `apps/mobile/README.md` for the exact Windows commands. In short: an Apple Developer Program membership and an Expo account are needed. EAS builds the app on Expo’s Mac servers, so no Mac is required. TestFlight then installs it on Dave’s iPhone. Status: **IOS_SIGNING_BLOCKED_EXTERNAL** until those accounts exist. No native build has been made or tested on a device.
