/**
 * سرویس ارسال پیامک کد تایید (OTP)
 * ----------------------------------------------------------------------------
 * در پروداکشن باید یک ارائه‌دهندهٔ واقعی پیامک تنظیم شود (کاوه‌نگار به‌صورت پیش‌فرض
 * پشتیبانی می‌شود). تا وقتی ارائه‌دهنده تنظیم نشده، در حالت توسعه کد فقط در کنسول
 * چاپ می‌شود و در پاسخ API هم (فقط در توسعه) برمی‌گردد؛ اما در پروداکشن هرگز کد
 * در پاسخ برنمی‌گردد (رفع آسیب‌پذیری SEC-01).
 *
 * متغیرهای محیطی:
 *   NODE_ENV            production | development
 *   SMS_PROVIDER        kavenegar | console | none   (پیش‌فرض: console در توسعه، none در پروداکشن)
 *   KAVENEGAR_API_KEY   کلید API کاوه‌نگار
 *   KAVENEGAR_TEMPLATE  نام الگوی verify-lookup (پیش‌فرض: verify)
 *
 * خروجی sendOtp:  { delivered: boolean }
 *   delivered=true  → پیامک واقعی ارسال شد  → نباید کد در پاسخ API برگردد
 *   delivered=false → ارائه‌دهنده تنظیم نشده → فقط در توسعه مجاز است
 */

const isProd = () => process.env.NODE_ENV === 'production';

/** ارائه‌دهندهٔ فعال را تعیین می‌کند. */
function activeProvider() {
  const p = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
  if (p) return p;
  return isProd() ? 'none' : 'console';
}

/** آیا یک ارائه‌دهندهٔ واقعی پیامک پیکربندی شده است؟ */
export function isSmsConfigured() {
  const p = activeProvider();
  return p !== 'console' && p !== 'none';
}

/** ارسال با کاوه‌نگار (verify lookup) */
async function sendKavenegar(phone, code) {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_TEMPLATE || 'verify';
  if (!apiKey) throw new Error('KAVENEGAR_API_KEY تنظیم نشده است');

  const url =
    `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json` +
    `?receptor=${encodeURIComponent(phone)}` +
    `&token=${encodeURIComponent(code)}` +
    `&template=${encodeURIComponent(template)}`;

  const res = await fetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.return?.status !== 200) {
    throw new Error(`خطای سرویس پیامک: ${data?.return?.message || `HTTP ${res.status}`}`);
  }
}

/**
 * ارسال کد تایید به شماره.
 * @returns {Promise<{ delivered: boolean }>}
 * @throws  اگر ارسال واقعی شکست بخورد یا در پروداکشن ارائه‌دهنده تنظیم نشده باشد.
 */
export async function sendOtp(phone, code) {
  const provider = activeProvider();

  switch (provider) {
    case 'kavenegar':
      await sendKavenegar(phone, code);
      return { delivered: true };

    case 'console':
      // فقط توسعه — کد در کنسول سرور چاپ می‌شود
      console.log(`📲 [DEV SMS] کد تایید برای ${phone}: ${code}`);
      return { delivered: false };

    case 'none':
    default:
      // پروداکشن بدون ارائه‌دهنده → ارسال ممکن نیست (نباید کد لو برود)
      throw new Error('سرویس پیامک پیکربندی نشده است (SMS_PROVIDER)');
  }
}
