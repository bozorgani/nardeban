import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      // حالت یکپارچه: عکس‌ها روی همان origin (پورت ۳۰۰۰) سرو می‌شوند
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3000', pathname: '/uploads/**' },
      // عکس‌ها وقتی سایت با IP شبکه باز شده
      { protocol: 'http', hostname: '192.168.*.*', port: '3000', pathname: '/uploads/**' },
      // سازگاری: اگر کسی هنوز بک‌اند جدا روی ۴۰۰۰ دارد
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
