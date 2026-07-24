/* دليل العملاء — service worker
   يخزّن هيكل التطبيق فقط ليفتح بدون إنترنت.
   بيانات العملاء تُخزَّن في IndexedDB (ليست هنا). */
const CACHE = 'cd-directory-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase API calls: always go to network (never cache data)
  if (url.pathname.includes('/rest/v1/')) return;
  // App shell + fonts/CDN: cache-first, fall back to network then cache
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (url.origin === location.origin || url.host.includes('fonts.') || url.host.includes('cdnjs.'))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
