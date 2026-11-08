# Deploying the Recall web app (PWA)

Status: **BUILT_NOT_DEPLOYED** / `DEPLOYMENT_BLOCKED_EXTERNAL`. The production build exists and is tested. It has **not** been put on a public website, because publishing a public site needs the repository owner’s approval. A service worker (offline mode) and “Add to Home Screen” need an **https://** address; `localhost` does not count for Dave’s phone.

The site is fully static: an `index.html`, one JS and one CSS file, an on-demand backup chunk, icons, a manifest and a service worker (`sw.js`). It makes **no requests to any other site** and needs no server code, database or secrets. It uses relative paths, so it works at a domain root or in a sub-folder (for example `https://<owner>.github.io/recall-dave/`).

## Option 1 — GitHub Pages (one click after a one-time setting)

The repository is currently **public**, so GitHub Pages is available at no cost. Note: Pages makes the app publicly reachable by anyone with the link. The app itself contains no personal data.

1. GitHub → repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Actions → deploy-pwa-to-pages → Run workflow** (branch: `claude/cool-allen-bu6jx0`, or `main` once merged).
3. When it finishes, the URL is shown on the workflow run (normally `https://openmanusmt.github.io/recall-dave/`).
4. Open that URL on the iPhone in Safari and follow `docs/IPHONE-INSTALL-AND-TEST.md`.

The workflow (`.github/workflows/deploy-pwa-to-pages.yml`) runs the unit tests, builds `apps/web/dist` and publishes it. It only runs when started by hand.

If the repository is made **private**: GitHub Pages for private repositories needs a paid GitHub plan. Use option 2 instead.

## Option 2 — any static HTTPS host (drag and drop)

Use the ready-made ZIP: `release/recall-pwa-1.0.0.zip` (checksums in `release/SHA256SUMS.txt`). Unzip it; upload the **contents of the `recall-pwa/` folder** to any static host that serves HTTPS, for example:

- **Netlify Drop** (free tier): drag the `recall-pwa` folder onto app.netlify.com/drop.
- **Cloudflare Pages** (free tier): “Upload assets”.

Check that the host serves `manifest.webmanifest` (any content type is accepted by iOS) and does **not** cache `sw.js` for a long time. Most hosts are fine by default.

## Rebuild from source (Windows 11, PowerShell)

```powershell
# Prerequisites: Git, Node.js 22 LTS (https://nodejs.org), Python 3.11+ (only for the optional checks)
git clone https://github.com/OpenManusMT/recall-dave.git
cd recall-dave
git checkout claude/cool-allen-bu6jx0
npm ci
npm run build          # output in apps/web/dist
npm run release        # also writes release/recall-pwa-<version>.zip and checksums
npm run preview        # try it at http://localhost:4173 (desktop browser only)
```

## Updating the live app later

Deploy the new build the same way. The service worker detects the new version (its cache name is a hash of the build) and switches to it the next time Recall is opened. Data on the phone is kept across updates. Data formats are versioned, and migrations are tested.
