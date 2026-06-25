import crypto from 'crypto';

/**
 * کمک‌توابع OTP (SEC-07 / SEC-08)
 * ----------------------------------------------------------------------------
 * - تولید کد عددیِ امن با crypto.randomInt (نه Math.random)
 * - هش‌کردن کد با SHA-256 برای ذخیره در دیتابیس (هرگز plaintext)
 * - مقایسهٔ امن در برابر timing attack
 *
 * چون OTP کوتاه‌عمر (۵ دقیقه) و یک‌بارمصرف است، SHA-256 سریع کافی است
 * (نیازی به bcrypt/فاکتور کند نیست؛ فضای brute-force با rate-limit و قفل
 * per-phone محدود می‌شود).
 */

const OTP_LENGTH = 6; // کد ۶ رقمی (SEC-07 — قوی‌تر از ۵ رقمی قبلی)

/** کد عددیِ تصادفیِ امن با طول ثابت (مثلاً "045213"). */
export function generateOtp() {
  const max = 10 ** OTP_LENGTH; // 1_000_000
  const n = crypto.randomInt(0, max);
  return String(n).padStart(OTP_LENGTH, '0');
}

/** هش SHA-256 کد (hex). شماره به‌عنوان salt سبک اضافه می‌شود تا هش‌ها یکتاتر شوند. */
export function hashOtp(code, phone = '') {
  return crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

/** مقایسهٔ امن دو هش (ضد timing attack). */
export function safeEqualHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
