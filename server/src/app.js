/**
 * فکتوری ساخت اپ Express — تمام middlewareها و مسیرهای API.
 *
 * این ماژول به‌جای index.js قبلی استفاده می‌شود: دیگر خودش سرور listen
 * نمی‌کند، بلکه اپ آماده‌شده را برمی‌گرداند تا custom server نردبان آن را
 * روی همان HTTP server که Next.js و Socket.io روی آن‌اند، سوار کند.
 *
 *  - مسیرهای /api/* و /uploads/* توسط Express هندل می‌شوند.
 *  - هر چیز دیگر در custom server (server.js) به getRequestHandler.next می‌رود.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { sanitizeRequest } from './middleware/sanitize.js';
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

  /* ---------- Rate Limiting ---------- */
  app.use('/api/', globalLimiter);
  app.use('/api/auth/request-otp', otpLimiter);
  app.use('/api/auth/verify-otp', verifyLimiter);
  app.use('/api/reports', (req, res, next) =>
    req.method === 'POST' ? writeLimiter(req, res, next) : next()
  );

  // سرو فایل‌های آپلودشده (با کش طولانی — فایل‌ها immutable اند)
  // مسیر از config/paths.js (روی والیوم پایدار در Docker — OPS-04)
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '30d',
      immutable: true,
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
