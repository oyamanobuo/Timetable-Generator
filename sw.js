const CACHE_NAME = 'timetable-generator-v1';
const APP_URL = new URL('./', self.registration.scope).href;
const INDEX_URL = new URL('index.html', APP_URL).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([APP_URL, INDEX_URL]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('timetable-generator-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// 画面本体はオンラインなら毎回最新版を取得し、通信できないときだけ保存版を表示
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(request, { ignoreSearch: true }))
        || (await cache.match(APP_URL))
        || (await cache.match(INDEX_URL))
        || Response.error();
    }
  })());
});
