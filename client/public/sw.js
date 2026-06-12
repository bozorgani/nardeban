/* ------------------------------------------------------------------
 * نردبان — Service Worker (PWA)
 * استراتژی‌ها:
 *  - استاتیک‌های Next (/_next/static): Cache-First (immutable hash دارند)
 *  - آیکون‌ها و منیفست: Cache-First
 *  - عکس‌های آگهی (/uploads): Stale-While-Revalidate (سقف ۶۰ عکس)
 *  - صفحات (navigate): Network-First با fallback به کش و صفحه آفلاین
 *  - API: همیشه Network-Only (داده زنده) — هرگز کش نمی‌شود
 * ------------------------------------------------------------------ */

const VERSION = 'v1';
const STATIC_CACHE = `nardeban-static-${VERSION}`;
const PAGE_CACHE = `nardeban-pages-${VERSION}`;
const IMG_CACHE = `nardeban-imgs-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const IMG_LIMIT = 60;

/* ---------- نصب: پیش‌کش ضروری‌ها ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          OFFLINE_URL,
          '/manifest.json',
          '/icons/icon-192.png',
          '/icons/icon-512.png',
        ])
      )
      .then(() => self.skipWaiting())
  );
});

/* ---------- فعال‌سازی: پاکسازی کش‌های قدیمی ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('nardeban-') && !k.endsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- پیام از صفحه (به‌روزرسانی فوری) ---------- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* ---------- محدودسازی تعداد آیتم‌های کش عکس ---------- */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await cache.delete(keys[0]);
    return trimCache(name, max);
  }
}

/* ---------- fetch ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ۱) API و سوکت — همیشه شبکه، هیچ دخالتی نمی‌کنیم
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return;

  // ۲) عکس‌های آپلودی آگهی‌ها (از سرور بک‌اند) — Stale-While-Revalidate
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              cache.put(request, res.clone());
              trimCache(IMG_CACHE, IMG_LIMIT);
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // فقط درخواست‌های same-origin از اینجا به بعد
  if (url.origin !== self.location.origin) return;

  // ۳) استاتیک‌های Next و آیکون‌ها — Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // ۴) ناوبری صفحات — Network-First با fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
  }
});
