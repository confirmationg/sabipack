// SabiPack service worker: makes the app and the Biology pack work with no internet.
// Bump VERSION whenever the shell files change so phones pick up the new copy.
const VERSION = 'sabipack-v1';
const SHELL = [
  '/', '/index.html', '/packs/biology.json', '/site.webmanifest',
  '/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png'
];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=DM+Sans:wght@400;500;700&display=swap';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    // Fonts are a nice-to-have: never fail the install because of them.
    try { await c.put(FONT_CSS, await fetch(FONT_CSS, { mode: 'no-cors' })); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                       // posts (AI notes) always go to the network
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return;

  const fontHost = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fontHost) return;

  // Show the saved copy at once, refresh it quietly in the background when online.
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return (await c.match('/index.html')) || Response.error();
    return Response.error();
  })());
});
