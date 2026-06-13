/**
 * 🪜 نردبان — Custom Server (یکپارچه‌سازی فرانت + بک‌اند)
 *
 * این فایل، نقطه‌ی ورود اصلی پروژه است. همه‌چیز روی «یک پروسه» و «یک پورت» اجرا می‌شود:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                    HTTP Server (PORT 3000)               │
 *   │  ┌───────────────────┐   ┌────────────────────────────┐ │
 *   │  │   Express (API)    │   │       Next.js (pages)       │ │
 *   │  │  /api/*  /uploads/*│   │  همه‌ی صفحات فرانت + SSR     │ │
 *   │  └───────────────────┘   └────────────────────────────┘ │
 *   │                     ┌────────────────┐                   │
 *   │                     │   Socket.io     │  چت real-time     │
 *   │                     └────────────────┘                   │
 *   └─────────────────────────────────────────────────────────┘
 *
 *  - مسیرهای /api/* و /uploads/* → Express (همان کد بک‌اند امتحان‌شده)
 *  - بقیه مسیرها → Next.js getRequestHandler (صفحات فرانت)
 *  - Socket.io به همان HTTP server وصل می‌شود (چت real-time)
 *  - اتصال MongoDB با کش (برای جلوگیری از چنداتصاله در dev HMR)
 *
 * اسکریپت‌ها:
 *   npm run dev          → node server.js  (نیاز به MongoDB لوکال یا MONGO_URI)
 *   npm run dev:memory   → USE_MEMORY_MONGO=1 node server.js (MongoDB درون‌حافظه‌ای + seed)
 */
import dotenv from 'dotenv';
import { createServer } from 'http';
import next from 'next';

// بارگذاری env قبل از ایمپورت ماژول‌های بک‌اند (چون push.js کلیدهای VAPID را هنگام import می‌خواند)
dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function main() {
  /* ---------- اتصال دیتابیس ---------- */
  if (process.env.USE_MEMORY_MONGO === '1') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri('nardeban');
    console.log('🧪 In-memory MongoDB:', process.env.MONGO_URI);

    const { connectDB } = await import('./backend/src/config/db.js');
    await connectDB();

    const { seedDemoData } = await import('./backend/src/config/seedDemo.js');
    await seedDemoData();
  } else {
    const { connectDB } = await import('./backend/src/config/db.js');
    await connectDB();
  }

  /* ---------- شروع چکر دوره‌ای جستجوهای ذخیره‌شده ---------- */
  const { startSavedSearchNotifier } = await import('./backend/src/savedSearchNotifier.js');
  startSavedSearchNotifier();

  /* ---------- آماده‌سازی Next.js ---------- */
  const hostname = '0.0.0.0'; // دسترسی از شبکه محلی هم ممکن باشد
  const nextApp = next({ dev, hostname, port: PORT });
  const nextHandler = nextApp.getRequestHandler();
  await nextApp.prepare();
  console.log('✅ Next.js ready');

  /* ---------- ساخت اپ Express (API) ---------- */
  const { createApp } = await import('./backend/src/app.js');
  const { initSocket } = await import('./backend/src/socket.js');
  const expressApp = createApp();

  // catch-all: هر چیزی که Express هندل نکرد → Next.js (صفحات فرانت)
  // این باید بعد از مسیرهای /api و /uploads بیاید.
  expressApp.all('*', (req, res) => nextHandler(req, res));

  /* ---------- یک HTTP server مشترک برای Express + Next + Socket.io ---------- */
  const server = createServer(expressApp);
  initSocket(server); // ⚡ چت Real-time روی همان پورت

  server.listen(PORT, () => {
    console.log(`🚀 نردبان روی http://localhost:${PORT}  (فرانت + API + Socket.io یکپارچه)`);
  });
}

main().catch((err) => {
  console.error('❌ خطا در بالا آمدن سرور:', err);
  process.exit(1);
});
