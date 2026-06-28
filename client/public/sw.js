/* ------------------------------------------------------------------
 * بفروش — Service Worker (PWA)
 * استراتژی‌ها:
 *  - استاتیک‌های Next (/_next/static): Cache-First (immutable hash دارند)
 *  - آیکون‌ها و منیفست: Cache-First
 *  - عکس‌های آگهی (/uploads): Stale-While-Revalidate (سقف ۶۰ عکس)
 *  - صفحات (navigate): Network-First با fallback به کش و صفحه آفلاین
 *  - API: همیشه Network-Only (داده زنده) — هرگز کش نمی‌شود
 * ------------------------------------------------------------------ */

const VERSION = 'v5';
const STATIC_CACHE = `befrosh-static-${VERSION}`;
const PAGE_CACHE = `befrosh-pages-${VERSION}`;
const IMG_CACHE = `befrosh-imgs-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const IMG_LIMIT = 60;

// 🔒 مسیرهای احراز‌شده/شخصی — هرگز در PAGE_CACHE نوشته نمی‌شوند تا
// داده‌ی یک کاربر به کاربر دیگر روی همان دستگاه نشت نکند (نشت بین‌کاربری).
const PRIVATE_PATHS = ['/me', '/my-ads', '/favorites', '/chat', '/admin', '/saved-searches', '/auth'];
const isPrivatePath = (pathname) =>
  PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

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
            .filter((k) => k.startsWith('befrosh-') && !k.endsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- پیام از صفحه (به‌روزرسانی فوری) ---------- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  // 🔒 هنگام خروج از حساب: کش صفحات (که ممکن است شامل صفحات احراز‌شده باشد)
  // کاملاً پاک می‌شود تا داده‌ی کاربر قبلی به کاربر بعدی روی همین دستگاه نشت نکند.
  if (event.data === 'CLEAR_SESSION') {
    event.waitUntil(
      caches.delete(PAGE_CACHE).then(() => {
        // به همهٔ تب‌ها اطلاع بده (در صورت نیاز به واکنش)
        return self.clients.matchAll().then((cs) =>
          cs.forEach((c) => c.postMessage({ type: 'SESSION_CLEARED' }))
        );
      })
    );
  }
});

/* ---------- 📲 Web Push: نمایش نوتیفیکیشن چت ---------- */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'بفروش', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'بفروش';
  // 🔔 گروه‌بندی نوتیفیکیشن (tag):
  //  - اگر سرور tag بفرستد (مثل conv-<id> یا search-<id>) → همان استفاده می‌شود
  //    (پیام‌های یک گفتگو روی هم جایگزین می‌شوند، که درست است).
  //  - اگر tag نبود ولی convId هست → chat-<convId> (هر گفتگو جدا).
  //  - اگر هیچ‌کدام نبود → tag یکتا تا نوتیفیکیشن‌های نامرتبط روی هم collapse نشوند
  //    (قبلاً fallback ثابت 'befrosh' همهٔ پیام‌ها را با هم جایگزین می‌کرد = پسرفت UX).
  const tag =
    data.tag ||
    (data.convId ? `chat-${data.convId}` : `befrosh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const options = {
    body: data.adTitle ? `${data.body}\n📦 ${data.adTitle}` : data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag,
    renotify: true,
    dir: 'rtl',
    lang: 'fa',
    data: { url: data.url || '/chat' },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ---------- کلیک روی نوتیف: باز کردن/فوکس همان گفتگو ---------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // اگر تب باز داریم، فوکس و ناوبری
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.focus();
          if ('navigate' in client) return client.navigate(url);
          return client.postMessage({ type: 'NAVIGATE', url });
        }
      }
      // وگرنه پنجره جدید
      return self.clients.openWindow(url);
    })
  );
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
    const isPrivate = isPrivatePath(url.pathname);
    event.respondWith(
      fetch(request)
        .then((res) => {
          // 🔒 صفحات احراز‌شده/شخصی هرگز کش نمی‌شوند (جلوگیری از نشت بین‌کاربری).
          // فقط صفحات عمومی (فید، آگهی، دسته‌ها، ...) در PAGE_CACHE نوشته می‌شوند.
          if (res.ok && !isPrivate) {
            const clone = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          // در حالت آفلاین: برای مسیر خصوصی هرگز نسخهٔ کش‌شده را نشان نده
          // (ممکن است متعلق به کاربر قبلی باشد) → صفحهٔ آفلاین.
          if (isPrivate) return caches.match(OFFLINE_URL);
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
  }
});
