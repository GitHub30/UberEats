const CACHE_VERSION = '__BUILD_VERSION__';
const STATIC_CACHE = `machieats-static-${CACHE_VERSION}`;
const PAGE_CACHE = `machieats-pages-${CACHE_VERSION}`;
const BASE_PATH = '/UberEats';

const PRECACHE_STATIC = [
  `${BASE_PATH}/offline.html`,
  `${BASE_PATH}/manifest.webmanifest`,
  `${BASE_PATH}/icons/icon-192.png`,
  `${BASE_PATH}/icons/icon-512.png`,
  `${BASE_PATH}/images/hero.webp`,
  /* __VITE_ASSETS__ */
];

const PRECACHE_PAGES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/customer/`,
  `${BASE_PATH}/driver/`,
  `${BASE_PATH}/merchant/`,
  `${BASE_PATH}/admin/`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      // offline.html is mandatory; cache remaining assets individually so one transient failure doesn't abort all
      await staticCache.add(`${BASE_PATH}/offline.html`);
      await Promise.allSettled(
        PRECACHE_STATIC.filter((u) => u && u !== `${BASE_PATH}/offline.html`).map((url) =>
          staticCache.add(url)
        )
      );
      const pageCache = await caches.open(PAGE_CACHE);
      await Promise.allSettled(PRECACHE_PAGES.map((url) => pageCache.add(url)));
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-only for mutations and Cloudflare Worker API calls
  if (request.method !== 'GET' || url.hostname.endsWith('.workers.dev')) {
    event.respondWith(
      fetch(request).catch(() => {
        if (url.hostname.endsWith('.workers.dev')) {
          return new Response(
            JSON.stringify({ error: '現在オフラインです。通信環境をご確認のうえ再試行してください。' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }
        return new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Navigation requests: Network-first, fallback explicitly to PAGE_CACHE then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && !res.redirected && res.type === 'basic') {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const pageCache = await caches.open(PAGE_CACHE);
          const staticCache = await caches.open(STATIC_CACHE);
          const hit =
            (await pageCache.match(request, { ignoreSearch: true })) ||
            (await pageCache.match(`${BASE_PATH}/`)) ||
            (await staticCache.match(`${BASE_PATH}/offline.html`));
          return hit || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        })
    );
    return;
  }

  // Same-origin static assets: Stale-while-revalidate with guaranteed Response fallback
  if (url.origin === self.location.origin && url.pathname.startsWith(`${BASE_PATH}/`)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && res.ok && !res.redirected && res.type === 'basic') {
              cache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => cached || new Response('Offline', { status: 503 }));
        return cached || networkPromise;
      })
    );
  }
});
