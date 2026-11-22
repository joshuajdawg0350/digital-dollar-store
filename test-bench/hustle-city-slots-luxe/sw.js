/* Hustle City Slots — Poker Luxe service worker. (c) 2026 J-Dawgs Industries. */
const CACHE = 'hc-slots-luxe-v5';
const ASSETS = [
  './', './index.html', './style.css', './game.js', './logic.js', './machines.js', './soundkit.js',
  './assets/sfx/bell.mp3', './assets/sfx/win-small.mp3', './assets/sfx/win-med.mp3',
  './assets/sfx/win-big.mp3', './assets/sfx/coins.mp3', './assets/sfx/coin.mp3',
  './assets/sfx/count-tick.mp3', './assets/sfx/bust.mp3', './assets/sfx/fanfare.mp3',
  './assets/sfx/fs-flourish.mp3', './assets/sfx/garage-door.mp3',
  './assets/sfx/lever.mp3',
  './assets/sfx/reel-roll.mp3', './assets/sfx/trunk-open.mp3',
  './assets/sfx/tension.mp3', './assets/sfx/engine-bust.mp3', './assets/sfx/dice-shake.mp3',
  './assets/sfx/dice-roll.mp3', './assets/sfx/peg.mp3', './assets/sfx/near-bell.mp3',
  './assets/sfx/click.mp3', './assets/sfx/thunk.mp3',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './assets/sym-ac.webp', './assets/sym-kg.webp',
  './assets/sym-qn.webp', './assets/sym-jk.webp', './assets/sym-dm.webp',
  './assets/sym-cp.webp', './assets/sym-cg.webp', './assets/sym-dk.webp',
  './assets/sym-wd.webp', './assets/sym-sc.webp', './assets/sym-bn.webp',
  './assets/sym-x2.webp', './assets/sym-x3.webp',
  './assets/deck-plate.webp', './assets/belly.webp', './assets/coin-tray.webp'
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
