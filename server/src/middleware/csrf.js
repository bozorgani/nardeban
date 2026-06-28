/**
 * محافظت CSRF با بررسی Origin/Referer (SEC)
 * ----------------------------------------------------------------------------
 * چرا: احراز هویت با کوکی است. اگر COOKIE_SAMESITE=none باشد (فرانت و API روی
 * دامنهٔ متفاوت)، مرورگر کوکی را در درخواست‌های cross-site هم می‌فرستد و سایت
 * مهاجم می‌تواند درخواست state-changing با کوکی قربانی بزند (CSRF). با SameSite=lax
 * هم برخی حالات (مثل ناوبری top-level) ریسک باقی می‌ماند.
 *
 * راهکار: برای متدهای تغییردهنده (POST/PUT/PATCH/DELETE)، هدر Origin (یا Referer)
 * باید با allowlist مجاز (همان CLIENT_ORIGIN در CORS) بخواند. درخواست‌های مرورگری
 * همیشه Origin را روی این متدها می‌فرستند؛ نبودِ Origin معمولاً یعنی same-origin
 * یا کلاینت غیرمرورگری (curl/اپ) که هدف CSRF نیستند.
 *
 * این روش stateless است (نیازی به CSRF token و ذخیره‌سازی ندارد) و با معماری
 * فعلی (کوکی HttpOnly + CORS allowlist) کاملاً هماهنگ است.
 */
import { isAllowedOrigin } from '../config/cors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (origin) {
    // Origin موجود → باید در allowlist باشد
    if (isAllowedOrigin(origin)) return next();
    return res.status(403).json({ message: 'منبع درخواست نامعتبر است (CSRF)' });
  }

  // بدون Origin: بعضی مرورگرها روی same-origin، Origin نمی‌فرستند؛ به Referer رجوع کن
  const referer = req.headers.referer;
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (isAllowedOrigin(refOrigin)) return next();
      return res.status(403).json({ message: 'منبع درخواست نامعتبر است (CSRF)' });
    } catch {
      return res.status(403).json({ message: 'منبع درخواست نامعتبر است (CSRF)' });
    }
  }

  // نه Origin و نه Referer → کلاینت غیرمرورگری (curl/اپ موبایل/SSR) یا same-origin
  // قدیمی. این‌ها بردار CSRF نیستند (مهاجم نمی‌تواند کوکی قربانی را از این مسیرها
  // سوار کند). اجازه می‌دهیم تا سازگاری حفظ شود.
  return next();
}
