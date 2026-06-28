import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * میدل‌ور بهینه‌سازی عکس‌های آپلودشده (بعد از Multer):
 *  - تصویر اصلی: حداکثر ۱۶۰۰px، WebP کیفیت ۷۴ (effort 6) — برای صفحهٔ جزئیات/گالری
 *  - thumbnail: ۲۸۸px، WebP کیفیت ۶۲ (effort 6) — برای کارت‌ها/لیست‌ها
 *      (کارت‌ها در ~۱۲۸px نمایش داده می‌شوند؛ ۲۸۸px پوشش رتینا تا ~۲.۲x است)
 *  - smartSubsample برای حفظ کیفیت لبه‌ها در بیت‌ریت پایین
 *  - به‌روزرسانی filename/path در req.file(s) به فایل جدید
 *
 * 🔒 امنیت (Stored XSS): اگر sharp روی فایل شکست بخورد (یعنی فایل واقعاً
 * تصویر معتبر نیست — مثلاً HTML با پسوند جعلی)، فایل خام حذف می‌شود و خطا
 * پرتاب می‌گردد. قبلاً catch فایل مهاجم را روی دیسک نگه می‌داشت و
 * express.static آن را با text/html سرو می‌کرد → امکان phishing/redirect.
 *
 * مبنای انتخاب کیفیت/اندازه: بنچمارک روی عکس واقعی نشان داد thumbnail از
 * ۲۸.۳KiB (۴۰۰px/q70) به ~۱۵.۵KiB (۲۸۸px/q62) می‌رسد = ~۴۵٪ کاهش حجم،
 * بدون افت محسوس کیفیت چون تصویر در کادر کوچک‌تری نمایش داده می‌شود.
 * AVIF بررسی شد (~۷۵٪ کاهش) ولی به‌دلیل encode بسیار کندتر روی VPS تک‌هسته‌ای
 * و نبودِ لایهٔ content-negotiation (فایل‌ها مستقیم سرو می‌شوند) فعلاً WebP می‌ماند.
 */

// تنظیمات متمرکز (قابل تیون از یک‌جا)
const MAIN_MAX = 1600;
const MAIN_QUALITY = 74;
const THUMB_MAX = 288;
const THUMB_QUALITY = 62;

async function optimizeOne(file) {
  const dir = path.dirname(file.path);
  // پسوند خام (.upload) را دور می‌ریزیم و خروجی را همیشه .webp می‌سازیم
  const base = path.basename(file.filename, path.extname(file.filename));
  const mainName = `${base}.webp`;
  const thumbName = `${base}.thumb.webp`;
  const mainPath = path.join(dir, mainName);
  const thumbPath = path.join(dir, thumbName);
  const rawPath = file.path;

  try {
    const img = sharp(rawPath, { failOn: 'none' }).rotate(); // EXIF rotation

    await Promise.all([
      img
        .clone()
        .resize({ width: MAIN_MAX, height: MAIN_MAX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: MAIN_QUALITY, effort: 6, smartSubsample: true })
        .toFile(mainPath),
      img
        .clone()
        .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY, effort: 6, smartSubsample: true })
        .toFile(thumbPath),
    ]);

    // حذف فایل خام اولیه (.upload) — همیشه، چون خروجی .webp جداست
    await fs.unlink(rawPath).catch(() => {});

    file.filename = mainName;
    file.path = mainPath;
    file.mimetype = 'image/webp';
  } catch (err) {
    // 🔒 فایل واقعاً تصویر نبود (پسوند/نوع جعلی) → پاک‌سازی کامل و خطا.
    // فایل خام و هر خروجی ناقص حذف می‌شوند تا چیزی روی دیسک نماند.
    await fs.unlink(rawPath).catch(() => {});
    await fs.unlink(mainPath).catch(() => {});
    await fs.unlink(thumbPath).catch(() => {});
    console.warn('⚠️ image optimize failed (فایل رد شد):', err.message);
    const e = new Error('فایل آپلودشده تصویر معتبری نیست');
    e.status = 400;
    throw e;
  }
}

export async function optimizeImages(req, _res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    // ابتدا «استمِ» اصلی هر فایل را از روی نام خام نگه می‌داریم (قبل از تغییر path)،
    // چون optimizeOne مقدار file.path را به .webp تغییر می‌دهد.
    const stems = files.map((f) =>
      f.path ? { dir: path.dirname(f.path), stem: path.basename(f.path, path.extname(f.path)) } : null
    );

    // همهٔ فایل‌ها را کامل پردازش می‌کنیم (allSettled تا یک خطا بقیه را قطع نکند).
    const results = await Promise.allSettled(files.map(optimizeOne));
    const failed = results.some((r) => r.status === 'rejected');

    if (failed) {
      // 🔒 سیاست all-or-nothing: اگر حتی یک فایل نامعتبر بود، کل آپلود رد می‌شود
      // و همهٔ مشتقات هر فایل (.upload خام، .webp، .thumb.webp) پاک می‌شوند تا
      // نه فایل مهاجم بماند و نه فایل یتیم.
      await Promise.all(
        stems.flatMap((s) =>
          s
            ? [
                fs.unlink(path.join(s.dir, `${s.stem}.upload`)).catch(() => {}),
                fs.unlink(path.join(s.dir, `${s.stem}.webp`)).catch(() => {}),
                fs.unlink(path.join(s.dir, `${s.stem}.thumb.webp`)).catch(() => {}),
              ]
            : []
        )
      );
      const firstErr = results.find((r) => r.status === 'rejected')?.reason;
      throw firstErr || Object.assign(new Error('فایل آپلودشده تصویر معتبری نیست'), { status: 400 });
    }
    next();
  } catch (err) {
    next(err);
  }
}
