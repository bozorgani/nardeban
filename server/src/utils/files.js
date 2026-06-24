import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '../config/paths.js';

/**
 * حذف امن فایل‌های آپلودشده از دیسک.
 * فقط مسیرهای داخل /uploads پذیرفته می‌شوند (جلوگیری از path traversal).
 * خطاها بی‌صدا نادیده گرفته می‌شوند (فایل از قبل حذف شده و...).
 */
export async function deleteUploads(paths = []) {
  const list = Array.isArray(paths) ? paths : [paths];
  await Promise.allSettled(
    list
      .filter((p) => typeof p === 'string' && p.startsWith('/uploads/'))
      .map((p) => {
        const name = path.basename(p); // فقط نام فایل — بدون ../
        const thumbName = name.replace(/(\.\w+)$/, '.thumb$1');
        return Promise.allSettled([
          fs.unlink(path.join(UPLOAD_DIR, name)),
          fs.unlink(path.join(UPLOAD_DIR, thumbName)), // thumbnail هم اگر بود
        ]);
      })
  );
}
