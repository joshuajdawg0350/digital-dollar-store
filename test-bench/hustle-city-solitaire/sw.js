/* Hustle City Solitaire — offline cache
   v7 (2026-11-21): page/document requests are NETWORK-FIRST so a returning
   player always gets the newest build when online — the old cache-first
   handler served the previous build on the first visit after every publish
   (proven in the v4->v6 upgrade simulation, Ticket: Cheryl small/blurry).
   Static assets stay cache-first; the cache is still the offline fallback. */
const CACHE = "hc-solitaire-v7";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const isDoc = e.request.mode === "navigate" || e.request.destination === "document"
    || /\/$|\/index\.html$/.test(new URL(e.request.url).pathname);
  if (isDoc) {
    // Network-first: fresh page when online, cached page only when offline.
    e.respondWith(fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })
      .then(hit => hit || caches.match("./index.html", { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match("./index.html", { ignoreSearch: true }))));
});
