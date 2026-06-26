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

  images: {
    remotePatterns: [
      // توسعه‌ی محلی: بک‌اند روی localhost:4000
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '4000', pathname: '/uploads/**' },
      // عکس‌ها وقتی سایت با IP شبکه باز شده
      { protocol: 'http', hostname: '192.168.*.*', port: '4000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '10.*.*.*', port: '4000', pathname: '/uploads/**' },
      // پروداکشن: عکس‌ها از همان دامنه پشت nginx سرو می‌شوند (/uploads/**).
      // اگر بعداً از next/image استفاده کردید، دامنهٔ واقعی خود را اینجا اضافه کنید:
      // { protocol: 'https', hostname: 'yourdomain.com', pathname: '/uploads/**' },
    ],
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
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https: wss: ws:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');

    return [
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
