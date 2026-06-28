import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // خروجی standalone: ایمیج Docker سبک (فقط فایل‌های لازم + node_modules حداقلی)
  output: 'standalone',

  // ریشه پروژه = همین پوشه client (جلوگیری از تشخیص اشتباه وقتی lockfile دیگری در پوشه‌های والد هست)
  turbopack: {
    root: __dirname,
  },

  // اجازه دسترسی به منابع dev (HMR و...) از دستگاه‌های شبکه محلی
  // فقط در توسعه اثر دارد؛ در پروداکشن نادیده گرفته می‌شود.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.17', // IP فعلی سیستم شما
    // الگوهای کل شبکه‌های خصوصی (هر دستگاهی روی وای‌فای):
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
  ],

  // 🖼 next/image (F2)
  // ----------------------------------------------------------------------
  // عکس‌ها از قبل توسط sharp روی بک‌اند به webp + thumb 288px تبدیل شده‌اند،
  // پس از یک loader passthrough استفاده می‌کنیم تا Next روی URL همان عکس
  // بنشیند (lazy/srcset/sizes/CLS) بدون optimization دوباره.
  // مزیت: نیازی به مدیریت remotePatterns برای دامنهٔ پروداکشن نیست؛ هر URLی
  // که از imgUrl/thumbUrl برگردد (نسبی یا مطلق به همان origin) کار می‌کند.
  images: {
    loader: 'custom',
    loaderFile: './lib/imageLoader.js',
  },

  // ------------------------------------------------------------------------
  // CSP و هدرهای امنیتی روی صفحات HTML (SEC-05)
  // چون صفحات را Next سرو می‌کند، CSP مؤثر برای XSS اینجا اعمال می‌شود.
  // منابع مجاز بر اساس استفادهٔ واقعی پروژه:
  //   - فونت Vazirmatn خودمیزبان (next/font/local) — نیازی به CDN نیست
  //   - کاشی‌های نقشه OpenStreetMap (img) + Nominatim (connect)
  //   - اتصال API/Socket.io به همان origin (connect: 'self' + ws/wss)
  // نکته: 'unsafe-inline' برای اسکریپت محافظ تم (FOUC) و بوت‌استرپ Next لازم است.
  // ------------------------------------------------------------------------
  async headers() {
    // origin واقعی API/WebSocket از env (در پروداکشن = همان دامنهٔ سایت، مثلاً https://befrosh.ir).
    // اگر API روی دامنهٔ دیگری باشد، همان‌جا هم به allowlist اضافه می‌شود.
    let apiOrigin = '';
    let wsOrigin = '';
    try {
      const u = new URL(process.env.NEXT_PUBLIC_API_URL || '');
      apiOrigin = u.origin;
      wsOrigin = `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`;
    } catch {
      /* env تنظیم نشده (build محلی) — فقط 'self' استفاده می‌شود */
    }

    // allowlist دقیق — به‌جای wildcardهای باز (https:/http:/ws:/wss:)
    const imgSrc = ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', apiOrigin]
      .filter(Boolean)
      .join(' ');
    const connectSrc = [
      "'self'",
      apiOrigin,
      wsOrigin,
      'https://nominatim.openstreetmap.org',
      'https://cloudflareinsights.com', // beacon آنالیتیکس کلودفلر
    ]
      .filter(Boolean)
      .join(' ');

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // Cloudflare Web Analytics (beacon) — توسط Cloudflare به‌صورت خودکار تزریق می‌شود.
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // 🔒 محدود به origin سایت/API + کاشی‌های نقشه (نه هر میزبان https/http)
      `img-src ${imgSrc}`,
      // 🔒 محدود به origin سایت/API + WebSocket همان origin + Nominatim + Cloudflare
      `connect-src ${connectSrc}`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');

    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/offline.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
