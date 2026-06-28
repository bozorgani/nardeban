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
  // 🔒 trust proxy (M7) — پشت Cloudflare → nginx → Express
  // ----------------------------------------------------------------------
  // قبلاً مقدار «1» بود؛ یعنی فقط آخرین پروکسی trusted است. اما زنجیرهٔ
  // X-Forwarded-For که به Express می‌رسد به این شکل است:
  //     [client, cloudflare-edge, nginx-passthrough]
  // با trust=1، Express رشتهٔ سمت راست (nginx) را حذف می‌کند و IP کلودفلر
  // را به‌عنوان «کلاینت واقعی» می‌بیند → همهٔ rate limiterها روی IP لبهٔ
  // کلودفلر اعمال می‌شدند، نه روی کاربر واقعی → bypass عملی محافظت‌ها.
  //
  // راه‌حل قطعی این است که در nginx از هدر CF-Connecting-IP استفاده کنیم
  // (تنظیم در nginx/nardeban.conf اعمال شد) و در Express فقط به loopback
  // اعتماد کنیم (چون فقط nginx روی همان ماشین به ما پراکسی می‌کند و XFF
  // را با IP واقعی کاربر می‌سازد).
  //
  // اگر روزی nginx را روی ماشین دیگری گذاشتید، IP/CIDR آن را اضافه کنید.
  app.set('trust proxy', 'loopback');

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

  // 🔒 error handler (M3) — جلوگیری از information disclosure
  // ----------------------------------------------------------------------
  // قبلاً err.message هر چه بود مستقیم به کلاینت برمی‌گشت؛ این یعنی پیام‌های
  // داخلی Mongoose/Node (مثلاً «E11000 duplicate key error collection: …»،
  // مسیر فایل، نام فیلد) به مهاجم نشت می‌کرد و کمک به نگاشت سرویس می‌شد.
  //
  // سیاست جدید:
  //   - خطاهای عملیاتی (که کد ما با err.status بین 400 تا 499 پرتاب کرده)
  //     پیام فارسیِ امن دارند → همان پیام به کلاینت می‌رود.
  //   - خطاهای شناخته‌شدهٔ ورودی (Mongoose ValidationError/CastError و
  //     MulterError و SyntaxError از body parser) به 400 با پیام عمومی map می‌شوند.
  //   - بقیه (500 یا بدون status) → فقط یک پیام عمومی «خطای داخلی سرور»؛
  //     جزئیات کامل (stack/پیام/متد/مسیر) فقط در لاگ سرور دیده می‌شوند.
  //   - در حالت توسعه (NODE_ENV !== production) برای سهولت دیباگ، پیام واقعی
  //     در پاسخ debug برگردانده می‌شود (هرگز در پروداکشن).
  app.use((err, req, res, _next) => {
    const status = Number.isInteger(err?.status) ? err.status : 500;
    const isClientError = status >= 400 && status < 500;

    // لاگ کامل سمت سرور (در آینده پشت لاگر ساختاریافته می‌رود)
    if (status >= 500) {
      console.error(`[ERR ${status}] ${req.method} ${req.originalUrl} —`, err);
    } else {
      // خطاهای کاربر را با حجم کمتر لاگ کن
      console.warn(`[WARN ${status}] ${req.method} ${req.originalUrl} — ${err?.message || err}`);
    }

    // map خطاهای شناخته‌شده به 400 امن
    let safeStatus = status;
    let safeMessage;

    if (isClientError && typeof err.message === 'string' && err.message.length < 300) {
      // خطای پرتاب‌شده توسط کد ما با پیام فارسیِ آماده
      safeMessage = err.message;
    } else if (err?.name === 'ValidationError') {
      safeStatus = 400;
      safeMessage = 'ورودی نامعتبر است';
    } else if (err?.name === 'CastError') {
      safeStatus = 400;
      safeMessage = 'شناسه یا مقدار نامعتبر است';
    } else if (err?.name === 'MulterError') {
      safeStatus = 400;
      // پیام‌های multer انگلیسی‌اند اما اطلاعات حساس ندارند؛ به فارسی map کنیم
      const map = {
        LIMIT_FILE_SIZE: 'حجم فایل بیش از حد مجاز است',
        LIMIT_FILE_COUNT: 'تعداد فایل‌ها بیش از حد مجاز است',
        LIMIT_UNEXPECTED_FILE: 'فایل غیرمنتظره ارسال شد',
      };
      safeMessage = map[err.code] || 'خطا در آپلود فایل';
    } else if (err?.type === 'entity.parse.failed' || err?.name === 'SyntaxError') {
      safeStatus = 400;
      safeMessage = 'داده ارسالی نامعتبر است';
    } else {
      safeStatus = 500;
      safeMessage = 'خطای داخلی سرور — لطفاً بعداً تلاش کنید';
    }

    const body = { message: safeMessage };
    // فقط در توسعه: جزئیات برای دیباگ. هرگز در پروداکشن.
    if (process.env.NODE_ENV !== 'production' && err?.message && err.message !== safeMessage) {
      body.debug = String(err.message).slice(0, 500);
    }
    res.status(safeStatus).json(body);
  });

  return app;
}
