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

/** گزینه‌های کوکی توکن (Secure فقط در پروداکشن). */
export function tokenCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // در توسعه روی http کار کند
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600 * 1000, // ۳۰ روز
  };
}
