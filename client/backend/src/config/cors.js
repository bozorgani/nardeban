/**
 * منطق مشترک CORS برای Express و Socket.io
 * مجاز:
 *  - CLIENT_ORIGIN از env (می‌تواند چندتایی با کاما باشد)
 *  - localhost / 127.0.0.1 با هر پورتی
 *  - IPهای شبکه خصوصی (192.168.x.x / 10.x.x.x / 172.16-31.x.x) با هر پورتی
 *    → دسترسی از گوشی روی همان وای‌فای بدون تنظیم اضافه
 * در پروداکشن، دامنه واقعی را در CLIENT_ORIGIN بگذارید.
 */
const envOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const PRIVATE_HOST =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isAllowedOrigin(origin) {
  if (!origin) return true; // curl / همان‌مبدا
  if (envOrigins.includes(origin)) return true;
  return PRIVATE_HOST.test(origin);
}

export const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error('CORS: مبدا مجاز نیست'));
  },
  credentials: true,
};
