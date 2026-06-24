import path from 'path';
import { fileURLToPath } from 'url';

/**
 * مسیرهای فایل‌سیستم — متمرکز (OPS-04)
 * ----------------------------------------------------------------------------
 * مسیر پوشهٔ آپلودها در یک‌جا تعریف می‌شود تا:
 *   - تکرار محاسبه در upload.js / files.js / app.js حذف شود (منبع واحد حقیقت)
 *   - با متغیر محیطی UPLOAD_DIR قابل override باشد (انعطاف برای استقرار/والیوم)
 *
 * در Docker این مسیر روی والیوم پایدار `uploads_data` mount می‌شود تا با هر
 * redeploy/restart از بین نرود (به docker-compose.yml نگاه کنید).
 *
 * نکته: مسیر URL عمومی همچنان `/uploads/...` است (مستقل از مسیر دیسک).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// پیش‌فرض: <ریشهٔ server>/uploads  (یعنی /app/uploads داخل کانتینر)
const DEFAULT_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : DEFAULT_UPLOAD_DIR;
