/**
 * پاک‌سازی ضد NoSQL injection (SEC-09)
 * ----------------------------------------------------------------------------
 * اپراتورهای مونگو ($...) و نقطه (.) را از کلیدهای ورودی حذف می‌کند تا کسی نتواند
 * با ارسال چیزی مثل { "$gt": "" } یا "a.b" منطق کوئری را دستکاری کند.
 *
 * روی req.body، req.params و req.query اعمال می‌شود.
 *
 * نکته دربارهٔ req.query:
 *   در Express 5 خاصیت req.query فقط getter است و قابل جایگزینی نیست؛ بنابراین
 *   به‌جای جایگزینی، محتوای همان آبجکت را in-place پاک می‌کنیم (کلیدهای بد را
 *   delete می‌کنیم). این روش هم در Express 4 و هم 5 کار می‌کند.
 */

const FORBIDDEN_KEY = /^\$|\./; // کلیدی که با $ شروع شود یا شامل نقطه باشد

/**
 * بررسی اینکه آیا یک مقدار «آلوده به اپراتور» است:
 * آبجکتی که (حتی به‌صورت تو در تو) شامل کلید با $ یا نقطه باشد.
 * چنین مقادیری در query string نشانهٔ تلاش injection اند (مثل ?cat[$ne]=x).
 */
function hasOperatorKey(val, depth = 0) {
  if (!val || typeof val !== 'object' || depth > 10) return false;
  for (const key of Object.keys(val)) {
    if (FORBIDDEN_KEY.test(key)) return true;
    if (hasOperatorKey(val[key], depth + 1)) return true;
  }
  return false;
}

/**
 * آبجکت/آرایه را به‌صورت بازگشتی و in-place پاک می‌کند.
 * کلیدهای آلوده حذف می‌شوند؛ ساختار خود آبجکت حفظ می‌شود (بدون جایگزینی reference).
 *
 * @param {object} obj
 * @param {boolean} dropOperatorValues  اگر true، مقداری که آبجکتِ آلوده به اپراتور
 *   است را کلاً حذف می‌کند (به‌جای خالی‌کردن). برای query string استفاده می‌شود تا
 *   پارامتری مثل ?category[$ne]=x به‌جای تبدیل به {} کاملاً حذف شود و route سالم بماند.
 */
function sanitizeInPlace(obj, depth = 0, dropOperatorValues = false) {
  if (!obj || typeof obj !== 'object' || depth > 10) return obj;

  if (Array.isArray(obj)) {
    for (const item of obj) sanitizeInPlace(item, depth + 1, dropOperatorValues);
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEY.test(key)) {
      delete obj[key]; // حذف کلید آلوده
      continue;
    }
    const val = obj[key];
    if (val && typeof val === 'object') {
      // در query: اگر مقدار یک آبجکتِ آلوده به اپراتور است، کل پارامتر را حذف کن
      if (dropOperatorValues && hasOperatorKey(val)) {
        delete obj[key];
        continue;
      }
      sanitizeInPlace(val, depth + 1, dropOperatorValues);
    }
  }
  return obj;
}

/** Middleware: پاک‌سازی body/params/query. */
export function sanitizeRequest(req, _res, next) {
  if (req.body) sanitizeInPlace(req.body);
  if (req.params) sanitizeInPlace(req.params);
  // SEC-09: در query پارامترهای آبجکتیِ آلوده به اپراتور کاملاً حذف می‌شوند
  // (مثلاً ?category[$ne]=x) تا هم injection خنثی شود و هم route با ورودی نامعتبر کرش نکند.
  if (req.query) sanitizeInPlace(req.query, 0, true);
  next();
}

// برای تست واحد
export { sanitizeInPlace };
