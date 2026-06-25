/**
 * سرویس ارسال پیامک کد تایید (OTP)
 * ----------------------------------------------------------------------------
 * ارائه‌دهنده‌ها:  smsir (پیش‌فرض تولید) | kavenegar | console | none
 * تا وقتی ارائه‌دهندهٔ واقعی تنظیم نشده، در حالت توسعه کد در کنسول چاپ و فقط در
 * توسعه در پاسخ API برمی‌گردد؛ در پروداکشن هرگز کد در پاسخ برنمی‌گردد (SEC-01).
 *
 * متغیرهای محیطی:
 *   NODE_ENV               production | development
 *   SMS_PROVIDER           smsir | kavenegar | console | none
 *   --- sms.ir ---
 *   SMSIR_API_KEY          توکن X-API-KEY از پنل sms.ir
 *   SMSIR_TEMPLATE_ID      شناسهٔ قالب verify
 *   SMSIR_PARAM_NAME       نام پارامتر کد در قالب (پیش‌فرض: CODE)
 *   --- کاوه‌نگار ---
 *   KAVENEGAR_API_KEY / KAVENEGAR_TEMPLATE
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

/** ارسال با sms.ir (Verify Send) */
async function sendSmsIr(phone, code) {
  const apiKey = process.env.SMSIR_API_KEY;
  const templateId = process.env.SMSIR_TEMPLATE_ID;
  const paramName = process.env.SMSIR_PARAM_NAME || 'CODE';
  if (!apiKey) throw new Error('SMSIR_API_KEY تنظیم نشده است');
  if (!templateId) throw new Error('SMSIR_TEMPLATE_ID تنظیم نشده است');

  const res = await fetch('https://api.sms.ir/v1/send/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      mobile: phone,
      templateId: Number(templateId),
      parameters: [{ name: paramName, value: String(code) }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  // sms.ir موفقیت را با status=1 برمی‌گرداند
  if (!res.ok || data?.status !== 1) {
    throw new Error(`خطای sms.ir: ${data?.message || `HTTP ${res.status}`}`);
  }
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
    case 'smsir':
      await sendSmsIr(phone, code);
      return { delivered: true };

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
