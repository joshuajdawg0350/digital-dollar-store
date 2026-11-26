/* Film Noir (working title) — service worker. Cache-first app shell so the
   machine opens instantly and plays offline once visited. Bump the cache
   name on every published change. (c) 2026 J-Dawgs Industries LLC. */
const CACHE = 'film-noir-v1';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'logic.js',
  'machines.js',
  'soundkit.js',
  'game.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'assets/marquee.webp',
  'assets/belly.webp',
  'assets/deck-plate.webp',
  'assets/coin-tray.webp',
  'assets/case-bg.webp',
  'assets/case-closed.webp',
  'assets/case-open.webp',
  'assets/snitch.webp',
  'assets/celeb-show.mp4',
  'assets/sym-ac.webp',
  'assets/sym-kg.webp',
  'assets/sym-dm.webp',
  'assets/sym-qn.webp',
  'assets/sym-jk.webp',
  'assets/sym-cp.webp',
  'assets/sym-wd.webp',
  'assets/sym-sc.webp',
  'assets/sym-bn.webp',
  'assets/sym-x2.webp',
  'assets/sym-x3.webp',
  'assets/sfx/bell.mp3',
  'assets/sfx/bust.mp3',
  'assets/sfx/click.mp3',
  'assets/sfx/coin.mp3',
  'assets/sfx/coins.mp3',
  'assets/sfx/count-tick.mp3',
  'assets/sfx/dice-roll.mp3',
  'assets/sfx/dice-shake.mp3',
  'assets/sfx/engine-bust.mp3',
  'assets/sfx/fanfare.mp3',
  'assets/sfx/fs-flourish.mp3',
  'assets/sfx/garage-door.mp3',
  'assets/sfx/lever.mp3',
  'assets/sfx/near-bell.mp3',
  'assets/sfx/peg.mp3',
  'assets/sfx/reel-roll.mp3',
  'assets/sfx/tension.mp3',
  'assets/sfx/thunk.mp3',
  'assets/sfx/trunk-open.mp3',
  'assets/sfx/win-big.mp3',
  'assets/sfx/win-med.mp3',
  'assets/sfx/win-small.mp3'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
