/**
 * استخراج توکن JWT از درخواست (SEC-04)
 * ----------------------------------------------------------------------------
 * اولویت:
 *   ۱) کوکی HttpOnly به نام nardeban_token  (روش امن اصلی برای مرورگر)
 *   ۲) هدر Authorization: Bearer <token>     (سازگاری با SSR/کلاینت‌های غیرمرورگری)
 *
 * پارس کوکی به‌صورت سبک و بدون وابستگی اضافه انجام می‌شود.
 */
export const TOKEN_COOKIE = 'nardeban_token';

function parseCookie(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** توکن را از کوکی یا هدر Authorization برمی‌گرداند (یا null). */
export function getTokenFromReq(req) {
  const cookies = parseCookie(req.headers?.cookie || '');
  if (cookies[TOKEN_COOKIE]) return cookies[TOKEN_COOKIE];

  const header = req.headers?.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);

  return null;
}

/** گزینه‌های کوکی توکن.
 * secure و sameSite از env قابل تنظیم‌اند تا با حالت استقرار هماهنگ شوند:
 *   - HTTPS و same-origin (پشت nginx): COOKIE_SECURE=true ، COOKIE_SAMESITE=lax  (پیش‌فرض پروداکشن)
 *   - موقتاً روی HTTP بدون SSL:        COOKIE_SECURE=false  (وگرنه مرورگر کوکی را ذخیره نمی‌کند)
 *   - فرانت و API روی دامنهٔ متفاوت:    COOKIE_SAMESITE=none ، COOKIE_SECURE=true
 */
export function tokenCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  // پیش‌فرض secure = در پروداکشن true، مگر اینکه صراحتاً COOKIE_SECURE=false شود
  let secure = isProd;
  if (process.env.COOKIE_SECURE === 'true') secure = true;
  else if (process.env.COOKIE_SECURE === 'false') secure = false;

  // SameSite قابل تنظیم؛ none نیاز به secure=true دارد (الزام مرورگر)
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  if (sameSite === 'none') secure = true;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 30 * 24 * 3600 * 1000, // ۳۰ روز
  };
}
