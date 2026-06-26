/**
 * منطق مشترک CORS برای Express و Socket.io (SEC-06)
 * ----------------------------------------------------------------------------
 * پروداکشن (NODE_ENV=production):
 *   فقط origin(های) دقیقِ CLIENT_ORIGIN مجازند (می‌تواند چندتایی با کاما باشد).
 *   هیچ localhost/IP خصوصی مجاز نیست. این برای حالت credentials:true حیاتی است
 *   (با کوکی HttpOnly در SEC-04) تا origin مهاجم نتواند با کوکی کاربر درخواست بزند.
 *
 * توسعه:
 *   علاوه بر CLIENT_ORIGIN، localhost/127.0.0.1 و IPهای شبکهٔ خصوصی با هر پورتی
 *   مجازند تا تست از گوشی روی همان وای‌فای ساده باشد.
 */
const isProd = process.env.NODE_ENV === 'production';

const envOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const PRIVATE_HOST =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isAllowedOrigin(origin) {
  // درخواست بدون Origin: same-origin مرورگر، curl، اپ موبایل، SSR.
  // اینها CORS با credentials از مرورگرِ سایت دیگر نیستند، پس بی‌خطرند.
  if (!origin) return true;

  // در هر محیطی، origin(های) دقیقِ env مجازند
  if (envOrigins.includes(origin)) return true;

  // localhost/IP خصوصی فقط در توسعه
  if (!isProd && PRIVATE_HOST.test(origin)) return true;

  return false;
}

export const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error('CORS: مبدا مجاز نیست'));
  },
  credentials: true,
};
