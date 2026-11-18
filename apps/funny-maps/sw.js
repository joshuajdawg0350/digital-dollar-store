/* Funny Maps — app-shell service worker.
   Scope: this folder only (/apps/funny-maps/).
   Job: cache the app shell (page, manifest, icons, character picker
   faces) so Funny Maps opens offline like an installed app.
   NOT its job: map tiles, routing, search, and the emergency state
   maps — the app runs all of that itself (its own fm-tiles-v1 /
   fm-emergency-v1 caches). This worker never touches those caches
   and never intercepts those requests: every cross-origin request,
   and every same-origin request that is not a shell file, passes
   straight through.
   Re-publish note: when a new build replaces index.html, bump
   SHELL_CACHE (v1 -> v2) in this file so installed apps pick it up. */
const SHELL_CACHE = 'funny-maps-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './characters/thumbs/bubba-04.webp',
  './characters/thumbs/dre-07.webp',
  './characters/thumbs/major-hurt-04.webp',
  './characters/thumbs/officer-doright-05.webp',
  './characters/thumbs/stoner-steve-01.webp',
  './characters/thumbs/nagging-nora-20.webp'
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

  /* Navigations to this app: serve the cached page shell, so the app
     opens with no service at all. Other documents are left alone. */
  if (req.mode === 'navigate') {
    const scope = self.registration.scope;
    if (url.href === scope || url.href === INDEX_ABS ||
        url.href.startsWith(scope + '?') || url.href.startsWith(INDEX_ABS + '?')) {
      event.respondWith(
        caches.open(SHELL_CACHE)
          .then(cache => cache.match(INDEX_ABS))
          .then(hit => hit || fetch(req))
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
