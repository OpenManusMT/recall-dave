/* Recall service worker — generated at build time from src/sw-template.js.
 * Precaches every file of the build so the app, all bundled passages and all
 * assets work offline after the first successful load. Same-origin only: it
 * never touches requests to other sites (there are none by design).
 */
const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE = 'recall-' + CACHE_VERSION;
const PRECACHE = __PRECACHE_LIST__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('recall-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'recall:version' && event.source) event.source.postMessage({ type: 'recall:version', version: CACHE_VERSION });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network first so updates arrive; fall back to the cached app shell when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(new URL('./index.html', self.registration.scope).href, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(new URL('./index.html', self.registration.scope).href, { ignoreSearch: true })
            .then((r) => r || caches.match(new URL('./', self.registration.scope).href)),
        ),
    );
    return;
  }

  // Static assets: cache first (they are content-hashed), then network.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
