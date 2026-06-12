import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * میدل‌ور بهینه‌سازی عکس‌های آپلودشده (بعد از Multer):
 *  - تغییر اندازه به حداکثر ۱۶۰۰px (حفظ نسبت، بدون بزرگ‌نمایی)
 *  - تبدیل به WebP کیفیت ۸۰ (حجم معمولاً ۵-۱۰ برابر کمتر)
 *  - تولید thumbnail ۴۰۰px با پسوند .thumb.webp (برای کارت‌ها)
 *  - به‌روزرسانی filename/path در req.file(s) به فایل جدید
 * اگر پردازش عکسی خراب شد، فایل اصلی همان می‌ماند (fail-safe).
 */
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
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(mainPath),
      img
        .clone()
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
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
