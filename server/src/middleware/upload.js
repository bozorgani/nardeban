import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { UPLOAD_DIR } from '../config/paths.js';

// اطمینان از وجود پوشهٔ آپلود (روی والیوم پایدار در Docker — OPS-04)
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// پسوندهای تصویری مجاز (دفاع لایه‌ای در کنار چک mimetype)
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // ⚠️ هرگز به originalname (قابل جعل توسط کلاینت) برای پسوند اعتماد نمی‌کنیم.
    // نام فایل خام را همیشه با پسوند .upload ذخیره می‌کنیم؛ optimizeImages
    // آن را به .webp تبدیل و فایل خام را حذف می‌کند. اگر sharp شکست خورد،
    // فایل با پسوند .upload می‌ماند که express.static آن را به‌عنوان HTML
    // سرو نمی‌کند (نه text/html). این جلوی Stored XSS از پسوند جعلی را می‌گیرد.
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.upload`);
  },
});

const fileFilter = (_req, file, cb) => {
  // دفاع لایه‌ای: هم mimetype و هم پسوندِ originalname باید تصویری باشند.
  // (هیچ‌کدام به‌تنهایی قابل‌اعتماد نیست؛ هر دو باید بگذرند.)
  const ext = path.extname(file.originalname || '').toLowerCase();
  const ok = ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext);
  cb(ok ? null : new Error('فقط تصویر JPG/PNG/WebP مجاز است'), ok);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});
