/**
 * فکتوری ساخت اپ Express — تمام middlewareها و مسیرهای API.
 *
 * این ماژول به‌جای index.js قبلی استفاده می‌شود: دیگر خودش سرور listen
 * نمی‌کند، بلکه اپ آماده‌شده را برمی‌گرداند تا custom server بفروش آن را
 * روی همان HTTP server که Next.js و Socket.io روی آن‌اند، سوار کند.
 *
 *  - مسیرهای /api/* و /uploads/* توسط Express هندل می‌شوند.
 *  - هر چیز دیگر در custom server (server.js) به getRequestHandler.next می‌رود.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { sanitizeRequest } from './middleware/sanitize.js';
import { csrfProtection } from './middleware/csrf.js';
import { globalLimiter, otpLimiter, verifyLimiter, writeLimiter } from './middleware/limiters.js';
import { corsOptions } from './config/cors.js';
import { UPLOAD_DIR } from './config/paths.js';

import authRoutes from './routes/auth.routes.js';
import adRoutes from './routes/ad.routes.js';
import categoryRoutes from './routes/category.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import pushRoutes from './routes/push.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportRoutes from './routes/report.routes.js';
import savedSearchRoutes from './routes/savedSearch.routes.js';
import seoRoutes from './routes/seo.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // پشت Nginx/پروکسی، IP واقعی برای rate-limit

  // فشرده‌سازی gzip/brotli روی پاسخ‌های JSON و HTML — کاهش چشمگیر حجم انتقال و TTFB
  app.use(compression());

  /* ---------- امنیت ---------- */
  // helmet روی پاسخ‌های API/uploads. CSP اصلیِ صفحات HTML در Next.js اعمال می‌شود
  // (next.config headers) چون صفحات را Next سرو می‌کند نه Express (SEC-05).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // عکس‌ها از کلاینت لود می‌شوند
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // پاسخ‌های backend عمدتاً JSON و عکس‌اند؛ سیاست سخت‌گیرانه:
          defaultSrc: ["'none'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
        },
      },
    })
  );
  app.use(cors(corsOptions));

  // پاکسازی اپراتورهای مونگو ($ و .) از body، params و query — ضد NoSQL injection (SEC-09)
  app.use(sanitizeRequest);

  // پارس بدنه‌ی JSON فقط برای مسیرهای API (تا با body صفحات Next تداخل نکند)
  app.use('/api', express.json({ limit: '2mb' }));

  // محافظت CSRF: بررسی Origin/Referer روی متدهای تغییردهنده (SEC)
  // مهم وقتی COOKIE_SAMESITE=none است (فرانت/API روی دامنهٔ متفاوت).
  app.use('/api', csrfProtection);

  /* ---------- Rate Limiting ---------- */
  app.use('/api/', globalLimiter);
  app.use('/api/auth/request-otp', otpLimiter);
  app.use('/api/auth/verify-otp', verifyLimiter);
  app.use('/api/reports', (req, res, next) =>
    req.method === 'POST' ? writeLimiter(req, res, next) : next()
  );

  // سرو فایل‌های آپلودشده (با کش طولانی — فایل‌ها immutable اند)
  // مسیر از config/paths.js (روی والیوم پایدار در Docker — OPS-04)
  //
  // 🔒 سخت‌سازی امنیتی (دفاع لایه‌ای ضد Stored XSS):
  //  - فقط فایل‌های با پسوند تصویری مجازند؛ هر درخواست دیگر 404 می‌شود
  //    (حتی اگر فایل غیرتصویری به‌نحوی روی دیسک باقی مانده باشد، سرو نمی‌شود).
  //  - X-Content-Type-Options: nosniff → مرورگر نوع را از محتوا حدس نمی‌زند.
  //  - Content-Security-Policy محدود + Content-Disposition: inline با نوع امن.
  //  - فایل‌های .webp/.upload و هر مسیر مشکوک سرو نمی‌شوند.
  const SERVABLE_EXT = /\.(webp|jpe?g|png)$/i;
  app.use('/uploads', (req, res, next) => {
    if (!SERVABLE_EXT.test(req.path)) return res.status(404).end();
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // حتی اگر فایلی به‌اشتباه HTML باشد، این CSP اجرای اسکریپت/iframe را می‌بندد
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    next();
  });
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '30d',
      immutable: true,
      // فقط پسوندهای تصویری؛ index و dotfiles غیرفعال
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res, filePath) => {
        // نوع محتوا را بر اساس پسوندِ امن تثبیت می‌کنیم (نه حدس)
        if (/\.webp$/i.test(filePath)) res.setHeader('Content-Type', 'image/webp');
        else if (/\.png$/i.test(filePath)) res.setHeader('Content-Type', 'image/png');
        else if (/\.jpe?g$/i.test(filePath)) res.setHeader('Content-Type', 'image/jpeg');
      },
    })
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'nardeban-api', monolith: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/ads', adRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/saved-searches', savedSearchRoutes);
  app.use('/api/seo', seoRoutes);

  // error handler (فقط برای مسیرهای ثبت‌شده؛ catch-all برای Next در server.js اضافه می‌شود)
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'خطای سرور' });
  });

  return app;
}
