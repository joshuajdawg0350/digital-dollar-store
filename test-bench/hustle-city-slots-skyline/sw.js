/* Hustle City Slots — Midnight Skyline service worker. (c) 2026 J-Dawgs Industries. */
const CACHE = 'hc-slots-skyline-v2-1';
const ASSETS = [
  './', './index.html', './style.css', './game.js', './logic.js', './machines.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './assets/marquee.webp', './assets/sym-vt.webp', './assets/sym-sk.webp',
  './assets/sym-mn.webp', './assets/sym-tx.webp', './assets/sym-lm.webp',
  './assets/sym-sl.webp', './assets/sym-wd.webp', './assets/sym-sc.webp',
  './assets/sym-x2.webp', './assets/sym-x3.webp', './assets/sym-bn.webp'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
