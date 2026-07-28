/* دليل العملاء — service worker (v2)
   يخزّن هيكل التطبيق ليعمل بدون إنترنت،
   لكنه يجلب index.html من الشبكة أولاً حتى تصل التحديثات فوراً. */
const CACHE = 'cd-directory-v2';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();  // فعّل النسخة الجديدة فوراً دون انتظار
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // استعلامات Supabase: دائماً من الشبكة، لا تُخزَّن
  if (url.pathname.includes('/rest/v1/')) return;

  const isAppShell = req.mode === 'navigate' ||
                     url.pathname.endsWith('/') ||
                     url.pathname.endsWith('index.html');

  if (isAppShell) {
    // الشبكة أولاً: تجلب أحدث نسخة، وتعود للذاكرة فقط عند انقطاع الإنترنت
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
    return;
  }

  // باقي الملفات (الخطوط، مكتبة Excel): الذاكرة أولاً للسرعة
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
