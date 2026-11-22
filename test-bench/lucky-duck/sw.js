/* Lucky Duck personal machine — offline cache */
const CACHE = 'lucky-duck-v5';
const ASSETS = ['./', 'index.html', 'game.js', 'logic.js', 'manifest.webmanifest', 'assets/fonts/bebas-neue.woff2', 'assets/duck-medallion.jpg', 'assets/duck-bill.jpg', 'assets/seven-photo.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
