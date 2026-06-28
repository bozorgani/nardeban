#!/usr/bin/env node
/**
 * بازفشرده‌سازی thumbnailهای موجود با تنظیمات جدید (۲۸۸px / WebP q62).
 * ----------------------------------------------------------------------------
 * چرا: تغییر تنظیمات در optimizeImages.js فقط روی آپلودهای جدید اثر دارد.
 * این اسکریپت thumbnailهای قدیمیِ بزرگ (۴۰۰px/q70) را از روی تصویر اصلی
 * (`<base>.webp`) دوباره می‌سازد تا ~۴۵٪ صرفه‌جویی شامل آگهی‌های فعلی هم بشود.
 *
 * اجرا (روی سرور، داخل کانتینر backend یا با دسترسی به والیوم uploads):
 *   docker compose exec backend node scripts/recompress-thumbnails.mjs
 *   # یا حالت آزمایشی بدون نوشتن:
 *   docker compose exec backend node scripts/recompress-thumbnails.mjs --dry-run
 *
 * ایمن است: idempotent (چندبار اجرا مشکلی ندارد)، فقط فایل‌های .thumb.webp را
 * بازنویسی می‌کند، تصویر اصلی دست‌نخورده می‌ماند، و اگر فایلی خراب بود رد می‌شود.
 */
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { UPLOAD_DIR } from '../src/config/paths.js';

const THUMB_MAX = 288;
const THUMB_QUALITY = 62;
const DRY = process.argv.includes('--dry-run');

async function main() {
  let entries;
  try {
    entries = await fs.readdir(UPLOAD_DIR);
  } catch (err) {
    console.error('❌ پوشهٔ uploads قابل خواندن نیست:', UPLOAD_DIR, err.message);
    process.exit(1);
  }

  // تصاویر اصلی = *.webp که .thumb.webp نیستند
  const mains = entries.filter((f) => f.endsWith('.webp') && !f.endsWith('.thumb.webp'));
  console.log(`📂 ${UPLOAD_DIR}`);
  console.log(`🔎 ${mains.length} تصویر اصلی پیدا شد${DRY ? ' (حالت آزمایشی)' : ''}\n`);

  let done = 0, skipped = 0, savedBytes = 0;

  for (const main of mains) {
    const base = main.slice(0, -'.webp'.length);
    const thumbName = `${base}.thumb.webp`;
    const mainPath = path.join(UPLOAD_DIR, main);
    const thumbPath = path.join(UPLOAD_DIR, thumbName);

    try {
      let oldSize = 0;
      try { oldSize = (await fs.stat(thumbPath)).size; } catch { /* thumb نداشت */ }

      const buf = await sharp(mainPath, { failOn: 'none' })
        .rotate()
        .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY, effort: 6, smartSubsample: true })
        .toBuffer();

      if (oldSize && buf.length >= oldSize) {
        skipped++; // نسخهٔ جدید بزرگ‌تر/مساوی شد → دست نزن
        continue;
      }

      if (!DRY) await fs.writeFile(thumbPath, buf);
      savedBytes += Math.max(0, oldSize - buf.length);
      done++;
      if (done % 50 === 0) console.log(`  ... ${done} thumbnail پردازش شد`);
    } catch (err) {
      skipped++;
      console.warn(`  ⚠️ رد شد ${main}: ${err.message}`);
    }
  }

  console.log(`\n✅ پایان: ${done} بازفشرده، ${skipped} رد/بدون‌تغییر`);
  console.log(`💾 صرفه‌جویی تقریبی: ${(savedBytes / 1024 / 1024).toFixed(2)} MiB${DRY ? ' (آزمایشی — چیزی نوشته نشد)' : ''}`);
}

main();
