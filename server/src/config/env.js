/**
 * اعتبارسنجی و تأمین متغیرهای محیطی حساس (SEC-02)
 * ----------------------------------------------------------------------------
 * این ماژول هنگام بوت (در زمان import) اجرا می‌شود. هدف: جلوگیری از اجرای
 * ناخواستهٔ سرور در پروداکشن با کلید امضای پیش‌فرض/ضعیف.
 *
 *  - پروداکشن (NODE_ENV=production):
 *      JWT_SECRET الزامی است، باید حداقل ۳۲ کاراکتر و غیرپیش‌فرض باشد؛
 *      در غیر این صورت سرور با process.exit(1) متوقف می‌شود.
 *  - توسعه:
 *      اگر JWT_SECRET تنظیم نشده باشد، یک کلید توسعه‌ایِ ناامن (ثابت) استفاده
 *      می‌شود و فقط یک هشدار چاپ می‌گردد (تا dev:memory بدون .env کار کند).
 *
 * نکته: index.js پیش از هر import دیگری `dotenv/config` را بارگذاری می‌کند،
 * بنابراین process.env تا زمان ارزیابی این ماژول مقداردهی شده است.
 */

export const isProd = process.env.NODE_ENV === 'production';

// مقادیر پیش‌فرض/ضعیفِ شناخته‌شده که نباید در پروداکشن استفاده شوند
const WEAK_SECRETS = new Set([
  'dev-secret',
  'dev-only-insecure-secret-change-me',
  'change-me-to-a-long-random-string',
  'secret',
  'changeme',
  'jwt-secret',
]);

function fail(message) {
  console.error('❌ پیکربندی نامعتبر (SEC-02):', message);
  console.error('   ➜ یک کلید تصادفی بسازید، مثلاً:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  console.error('   ➜ سپس آن را در متغیر محیطی JWT_SECRET قرار دهید و سرور را دوباره اجرا کنید.');
  process.exit(1);
}

let secret = process.env.JWT_SECRET?.trim();

if (isProd) {
  if (!secret) fail('JWT_SECRET تنظیم نشده است.');
  if (secret.length < 32) fail('JWT_SECRET باید حداقل ۳۲ کاراکتر باشد.');
  if (WEAK_SECRETS.has(secret)) fail('JWT_SECRET برابر یک مقدار پیش‌فرض/ضعیف است.');
} else if (!secret) {
  secret = 'dev-only-insecure-secret-change-me';
  console.warn(
    '⚠️ JWT_SECRET تنظیم نشده — استفاده از کلید توسعه‌ایِ ناامن. فقط برای محیط توسعه مجاز است.'
  );
}

/** کلید امضای JWT — تنها منبع معتبر در کل برنامه. */
export const JWT_SECRET = secret;

// 🔒 M10: گارد بوت‌تایم برای پرچم خطرناک LOG_OTP
// قبلاً مسیری وجود داشت که با LOG_OTP=true در پروداکشن، کد OTP در لاگ چاپ می‌شد.
// آن مسیر در auth.routes حذف شده ولی برای جلوگیری از سوء‌تفاهم (کسی env را
// از روی مستندات قدیمی کپی کند)، اگر در پروداکشن این متغیر set باشد، سرور با
// خطای واضح ترک می‌شود؛ نباید بی‌سر و صدا نادیده گرفته شود.
if (isProd && process.env.LOG_OTP === 'true') {
  console.error(
    '❌ پیکربندی نامعتبر (SEC): LOG_OTP=true در پروداکشن مجاز نیست.\n' +
      '   ➜ این مقدار یک escape hatch ناامن قدیمی است که حذف شده. آن را از env پاک کنید.'
  );
  process.exit(1);
}
