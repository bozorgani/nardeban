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
      // پروداکشن: بک‌اند روی Render (https://your-app.onrender.com)
      { protocol: 'https', hostname: '*.onrender.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '*.railway.app', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
