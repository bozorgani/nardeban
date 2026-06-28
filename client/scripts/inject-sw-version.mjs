/**
 * inject-sw-version.mjs — تزریق خودکار VERSION در Service Worker (F7)
 * ----------------------------------------------------------------------------
 * چرا:
 *   قبلاً مقدار `const VERSION = 'v6'` در public/sw.js دستی بود. اگر کسی
 *   فراموش می‌کرد bump کند، کاربران stale cache می‌گرفتند تا ابد. این
 *   اسکریپت قبل از build اجرا می‌شود و VERSION را به مقداری یکتا (هش/
 *   تایم‌استمپ یا git SHA) جایگزین می‌کند تا هر استقرار = نسخهٔ تازه.
 *
 * چطور:
 *   - public/sw.js دارد:  const VERSION = 'v6';   // SW_VERSION_PLACEHOLDER
 *   - این اسکریپت آن خط را با version جدید جایگزین می‌کند (در محل، خود فایل).
 *   - منبع version (به ترتیب اولویت):
 *       1) process.env.SW_VERSION اگر set باشد (CI)
 *       2) git rev-parse --short HEAD (اگر در یک مخزن git هستیم)
 *       3) تایم‌استمپ build (fallback)
 *
 * استفاده:
 *   اضافه‌شده به package.json:  "prebuild": "node scripts/inject-sw-version.mjs"
 *   اولین بار: تأیید کنید build روی سرور هم git در دسترس دارد، وگرنه از
 *   متغیر محیطی SW_VERSION استفاده کنید (داکر: ARG / Cloudflare Pages: env).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.join(__dirname, '..', 'public', 'sw.js');

function detectVersion() {
  if (process.env.SW_VERSION) return process.env.SW_VERSION.trim();
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    // git در دسترس نیست (مثلاً Docker بدون .git) → timestamp build
    return `b${Date.now().toString(36)}`;
  }
}

function main() {
  if (!fs.existsSync(SW_PATH)) {
    console.warn(`⚠️ sw.js یافت نشد در ${SW_PATH} — رد شد.`);
    return;
  }

  const version = detectVersion();
  const src = fs.readFileSync(SW_PATH, 'utf8');

  // الگوی جایگزینی: «const VERSION = '...';» در ابتدای فایل
  const re = /const\s+VERSION\s*=\s*['"][^'"]*['"]\s*;/;
  if (!re.test(src)) {
    console.warn('⚠️ خط `const VERSION = "..."` در sw.js یافت نشد — تغییری اعمال نشد.');
    return;
  }

  const out = src.replace(re, `const VERSION = '${version}'; // injected by prebuild`);
  fs.writeFileSync(SW_PATH, out);
  console.log(`✅ Service Worker VERSION ← '${version}' (در ${path.relative(process.cwd(), SW_PATH)})`);
}

main();
