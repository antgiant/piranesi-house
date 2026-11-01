// Offline support: once the House has been installed or opened, it opens again with no connection. On install it stores every file the
// page names (the page itself, its script and style, the icons and manifest), so it does not depend on having been used first. After
// that, same-origin files are answered from the cache at once and refreshed in the background, so a new version arrives the next time.
// Nothing else is ever stored here.
const CACHE = 'house-v2';
const ROOT = new URL('./', self.location.href).href;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(ROOT, { cache: 'reload' });
    const html = await res.clone().text();
    await cache.put(ROOT, res);
    const files = [...html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)].map((m) => new URL(m[1], ROOT).href);
    for (const extra of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) files.push(new URL(extra, ROOT).href);
    await Promise.all([...new Set(files)].map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => undefined)));
  })().catch(() => undefined));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // the page itself is always the one stored page, whatever follows the address (#room=..., ?x=...)
    const isPage = req.mode === 'navigate';
    const hit = await cache.match(isPage ? ROOT : req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) cache.put(isPage ? ROOT : req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await cache.match(ROOT)) || Response.error();
  })());
});
