/* Hustle City Slots — Poker Luxe service worker. (c) 2026 J-Dawgs Industries. */
const CACHE = 'hc-slots-luxe-v2';
const ASSETS = [
  './', './index.html', './style.css', './game.js', './logic.js', './machines.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './assets/sym-ac.webp', './assets/sym-kg.webp',
  './assets/sym-qn.webp', './assets/sym-jk.webp', './assets/sym-dm.webp',
  './assets/sym-cp.webp', './assets/sym-cg.webp', './assets/sym-dk.webp',
  './assets/sym-wd.webp', './assets/sym-sc.webp', './assets/sym-bn.webp',
  './assets/sym-x2.webp', './assets/sym-x3.webp'
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
