/* NstructR service worker: works offline once the app has been opened.
   The build fills in VERSION (a hash of every file below) and ASSETS. A new deploy changes the hash, so the
   browser installs the new worker, which caches the new files and deletes the old cache: the library and the
   app update together, the next time the app is opened while online. */
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = 'nstructr-' + VERSION, FONTS = 'nstructr-fonts-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('nstructr-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Google Fonts (Roboto Flex, Material Symbols): keep whatever was fetched once
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // the app itself: from the cache, falling back to the network; pages fall back to the cached app when offline
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => hit ||
    fetch(req).catch(() => (req.mode === 'navigate' ? c.match('./') : Response.error())))));
});
