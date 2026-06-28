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
 * اگر پردازش عکسی خراب شد، فایل اصلی همان می‌ماند (fail-safe).
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
  try {
    const dir = path.dirname(file.path);
    const base = path.basename(file.filename, path.extname(file.filename));
    const mainName = `${base}.webp`;
    const thumbName = `${base}.thumb.webp`;
    const mainPath = path.join(dir, mainName);
    const thumbPath = path.join(dir, thumbName);

    const img = sharp(file.path, { failOn: 'none' }).rotate(); // EXIF rotation

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

    // حذف فایل خام اولیه
    if (file.path !== mainPath) await fs.unlink(file.path).catch(() => {});

    file.filename = mainName;
    file.path = mainPath;
    file.mimetype = 'image/webp';
  } catch (err) {
    // فایل اصلی دست‌نخورده می‌ماند
    console.warn('⚠️ image optimize failed:', err.message);
  }
}

export async function optimizeImages(req, _res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    await Promise.all(files.map(optimizeOne));
    next();
  } catch (err) {
    next(err);
  }
}
