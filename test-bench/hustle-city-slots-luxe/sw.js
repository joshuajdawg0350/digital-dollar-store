/* Hustle City Slots — Poker Luxe service worker. (c) 2026 J-Dawgs Industries. */
/* v14 (fix, 2026-11-22): code files (HTML/JS/CSS) are NETWORK-FIRST — a phone
   can never be stuck running a stale or mixed build again (the Skull Vault
   paid in the current code but older cached builds on real phones did not
   reflect it, and the BUY BACK IN button never appeared). Media/assets stay
   cache-first for speed. The precache is fault-tolerant: one missing file
   can no longer fail the whole install and freeze a phone on an old build. */
const CACHE = 'hc-slots-luxe-v16';
const ASSETS = [
  './', './index.html', './style.css', './game.js', './logic.js', './machines.js', './soundkit.js', './cabinet-life.js',
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
  './assets/sym-wd.webp', './assets/sym-sc.webp', './assets/sym-bn.webp', './assets/sym-dd.webp', './assets/celeb-title.png', './assets/fonts/bebas-neue.woff2',
  './assets/sym-x2.webp', './assets/sym-x3.webp',
  './assets/deck-plate.webp', './assets/belly.webp', './assets/marquee-steel.webp', './assets/coin-tray.webp', './assets/celeb-bonus.mp4',
  './assets/vault-skull.webp',
  './assets/vault-door.webp', './assets/vault-chips.webp', './assets/vault-skullroom.webp', './assets/vault-led.webp', './assets/vault-wall.webp'
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const CODE_FILE = /\.(?:html|js|css)$/;
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isCode = e.request.mode === 'navigate' || CODE_FILE.test(url.pathname);
  if (isCode) {
    /* network-first: always serve the current build when online; the cache
       is only an offline fallback, refreshed on every successful fetch. */
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
