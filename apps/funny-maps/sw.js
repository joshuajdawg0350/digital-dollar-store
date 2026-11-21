/* Funny Maps — app-shell service worker.
   Scope: this folder only (/apps/funny-maps/).
   Job: cache the app shell (page, manifest, icons, character picker
   faces, and the VENDORED Leaflet library) so Funny Maps opens offline
   like an installed app, with no third-party CDN on its critical path.
   NOT its job: map tiles, routing, search, and the emergency state
   maps — the app runs all of that itself (its own fm-tiles-v1 /
   fm-emergency-v1 caches). This worker never touches those caches:
   every cross-origin request, and every same-origin request that is
   not a shell file, passes straight through.
   v2 (2026-11-18 repair): navigations are NETWORK-FIRST (fresh page
   when there's service, cached page only when there isn't) — a cached
   shell can never serve a stale or stalled page again — and Leaflet
   ships inside the shell instead of loading from unpkg, whose stall
   on second loads left the app dead with no error anywhere.
   v3 (2026-11-20): character picker faces swapped to Joshua's picks
   from the 2026-11-20 thumbnail board (all 8 characters).
   v4 (2026-11-20): the location-off card no longer covers the control
   panel (it floated over the sheet and froze every panel touch,
   Emergency Maps included); its dismissal is now remembered.
   v5 (2026-11-20): theme stings wired for the other six characters
   (Hurt, Doright, Steve, Nora, Smiri, Dislexa) — audio files ride
   along on demand like Bubba's and Jermaine's, not in the shell. */
const SHELL_CACHE = 'funny-maps-shell-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './vendor/leaflet.js',
  './vendor/leaflet.css',
  './characters/thumbs/bubba-01.webp',
  './characters/thumbs/jermaine-04.webp',
  './characters/thumbs/major-hurt-05.webp',
  './characters/thumbs/officer-doright-02.webp',
  './characters/thumbs/stoner-steve-02.webp',
  './characters/thumbs/nagging-nora-02.webp',
  './characters/thumbs/smiri-05.webp',
  './characters/thumbs/dislexa-02.webp'
];
const SHELL_ABS = SHELL.map(p => new URL(p, self.registration.scope).href);
const INDEX_ABS = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(n => n.startsWith('funny-maps-shell') && n !== SHELL_CACHE)
          .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* tiles & APIs: not ours */

  /* Navigations to this app: network first, cache as the offline
     fallback — the page a customer sees is always the current build
     when service exists. */
  if (req.mode === 'navigate') {
    const scope = self.registration.scope;
    if (url.href === scope || url.href === INDEX_ABS ||
        url.href.startsWith(scope + '?') || url.href.startsWith(INDEX_ABS + '?')) {
      event.respondWith(
        fetch(req)
          .then(r => {
            if (r && r.ok) {
              const copy = r.clone();
              caches.open(SHELL_CACHE).then(cache => cache.put(INDEX_ABS, copy));
            }
            return r;
          })
          .catch(() => caches.open(SHELL_CACHE).then(cache => cache.match(INDEX_ABS)))
      );
    }
    return;
  }

  /* Shell files: cache first, refresh in the background. */
  if (SHELL_ABS.includes(url.href)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async cache => {
        const hit = await cache.match(url.href);
        const refresh = fetch(req)
          .then(r => { if (r && r.ok) cache.put(url.href, r.clone()); return r; })
          .catch(() => hit);
        return hit || refresh;
      })
    );
  }
  /* Everything else (emergency maps, tiles, routing, …): untouched. */
});
