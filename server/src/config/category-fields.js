/**
 * فیلدها و فیلترهای اختصاصی دسته‌ها (سبک دیوار) — نسخهٔ per-subcategory با ارث‌بری (merge)
 * ----------------------------------------------------------------------------
 * کلید = slug هر دسته در «هر سطحی» (نه فقط سطح ۱).
 * فیلدهای یک دسته = ترکیب فیلدهای همهٔ اجداد (از ریشه) + فیلدهای خودش.
 *   - ارث‌بری: زیردسته فیلدهای والد را می‌گیرد و فیلدهای خودش را اضافه می‌کند.
 *   - override: اگر زیردسته فیلدی با همان key والد تعریف کند، نسخهٔ زیردسته برنده است.
 *
 * انواع: select | number | year
 * مقادیر در Ad.attrs (Map) ذخیره می‌شوند.
 */
export const CATEGORY_FIELDS = {
  /* ============================ وسایل نقلیه ============================ */
  vehicles: [
    { key: 'year', label: 'سال ساخت', type: 'year', min: 1360, max: 1404, filter: true },
    { key: 'mileage', label: 'کارکرد', type: 'number', unit: 'کیلومتر', filter: true },
    {
      key: 'bodyStatus', label: 'وضعیت بدنه', type: 'select',
      options: ['سالم و بی‌رنگ', 'خط و خش جزئی', 'صافکاری بی‌رنگ', 'رنگ‌شدگی', 'دوررنگ', 'تمام‌رنگ', 'تصادفی'], filter: false,
    },
  ],
  // خودرو (سواری) — برند خودرویی + گیربکس + سوخت
  cars: [
    {
      key: 'brand', label: 'برند', type: 'select',
      options: ['پراید', 'پژو', 'سمند', 'تیبا', 'کوییک', 'دنا', 'شاهین', 'تارا', 'رنو', 'کیا', 'هیوندای', 'تویوتا', 'نیسان', 'مزدا', 'ام‌وی‌ام', 'چری', 'جک', 'هوندا', 'سایر'],
      filter: true,
    },
    { key: 'gearbox', label: 'گیربکس', type: 'select', options: ['دنده‌ای', 'اتوماتیک'], filter: true },
    { key: 'fuel', label: 'سوخت', type: 'select', options: ['بنزین', 'دوگانه‌سوز', 'گاز (CNG)', 'دیزل', 'هیبرید', 'برقی'], filter: false },
  ],
  // موتورسیکلت — حجم موتور به‌جای گیربکس
  motorcycles: [
    {
      key: 'brand', label: 'برند', type: 'select',
      options: ['هوندا', 'یاماها', 'سوزوکی', 'کاوازاکی', 'باجاج', 'کی‌تی‌ام', 'بنلی', 'متفرقه', 'سایر'], filter: true,
    },
    { key: 'engineCc', label: 'حجم موتور (cc)', type: 'select', options: ['۵۰', '۱۰۰', '۱۲۵', '۱۵۰', '۲۰۰', '۲۵۰ یا بیشتر'], filter: true },
  ],

  /* ============================== املاک ============================== */
  'real-estate': [
    { key: 'area', label: 'متراژ', type: 'number', unit: 'متر', filter: true },
    {
      key: 'rooms', label: 'تعداد اتاق', type: 'select',
      options: ['بدون اتاق', '۱', '۲', '۳', '۴', '۵ یا بیشتر'], filter: true,
    },
    { key: 'buildYear', label: 'سال ساخت', type: 'year', min: 1360, max: 1404, filter: false },
    { key: 'elevator', label: 'آسانسور', type: 'select', options: ['دارد', 'ندارد'], filter: false },
    { key: 'parking', label: 'پارکینگ', type: 'select', options: ['دارد', 'ندارد'], filter: false },
  ],
  // اجارهٔ مسکونی — ودیعه و اجاره (مخصوص اجاره)
  'residential-rent': [
    { key: 'deposit', label: 'ودیعه (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'rent', label: 'اجارهٔ ماهانه (تومان)', type: 'number', unit: 'تومان', filter: true },
  ],

  /* =========================== کالای دیجیتال =========================== */
  // موبایل — حافظه/رم مخصوص گوشی
  'mobile-phones': [
    {
      key: 'brand', label: 'برند', type: 'select',
      options: ['سامسونگ', 'اپل', 'شیائومی', 'هواوی', 'نوکیا', 'ال‌جی', 'سونی', 'وان‌پلاس', 'گوگل', 'سایر'], filter: true,
    },
    { key: 'storage', label: 'حافظهٔ داخلی', type: 'select', options: ['۳۲ گیگ', '۶۴ گیگ', '۱۲۸ گیگ', '۲۵۶ گیگ', '۵۱۲ گیگ', '۱ ترابایت یا بیشتر'], filter: true },
    { key: 'ram', label: 'رم', type: 'select', options: ['۲', '۳', '۴', '۶', '۸', '۱۲', '۱۶ یا بیشتر'], filter: false },
    { key: 'condition2', label: 'وضعیت', type: 'select', options: ['نو/آکبند', 'کارکرده'], filter: false },
  ],
  // لپ‌تاپ — پردازنده/رم/حافظه/کارت‌گرافیک مخصوص لپ‌تاپ
  laptops: [
    {
      key: 'brand', label: 'برند', type: 'select',
      options: ['ایسوس', 'لنوو', 'اچ‌پی', 'دل', 'اپل', 'ام‌اس‌آی', 'ایسر', 'مایکروسافت', 'سایر'], filter: true,
    },
    { key: 'cpu', label: 'پردازنده', type: 'select', options: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Apple M', 'سایر'], filter: true },
    { key: 'ram', label: 'رم', type: 'select', options: ['۴', '۸', '۱۶', '۳۲', '۶۴ یا بیشتر'], filter: true },
    { key: 'storage', label: 'حافظه', type: 'select', options: ['HDD ۵۰۰', 'HDD ۱ ترابایت', 'SSD ۱۲۸', 'SSD ۲۵۶', 'SSD ۵۱۲', 'SSD ۱ ترابایت یا بیشتر'], filter: false },
    { key: 'gpu', label: 'کارت گرافیک', type: 'select', options: ['اشتراکی (داخلی)', 'مجزا (گرافیک مجزا)'], filter: false },
  ],
};

/**
 * ترکیب (merge) فیلدها بر اساس زنجیرهٔ slug از ریشه تا دسته.
 * @param {string[]} slugChain  از ریشه تا خود دسته، مثلاً ['digital','computers','laptops']
 * @returns {Array} فیلدهای ترکیب‌شده (فرزند بر والد اولویت دارد؛ بدون تکرار key)
 */
export function fieldsForChain(slugChain = []) {
  const byKey = new Map();
  for (const slug of slugChain) {
    const defs = CATEGORY_FIELDS[slug];
    if (!defs) continue;
    for (const f of defs) byKey.set(f.key, f); // override: آخرین (نزدیک‌ترین به برگ) برنده
  }
  return [...byKey.values()];
}

// پیدا کردن slug ریشه (سطح ۱) برای یک دسته با پیمایش والدها — حفظ سازگاری
export async function findRootSlug(Category, categoryId) {
  let cat = await Category.findById(categoryId).lean();
  let guard = 0;
  while (cat?.parent && guard < 10) {
    cat = await Category.findById(cat.parent).lean();
    guard++;
  }
  return cat?.slug || null;
}

/**
 * زنجیرهٔ slug از ریشه تا دستهٔ داده‌شده (شامل خودش).
 * @returns {Promise<string[]>}
 */
export async function slugChainFor(Category, { id = null, slug = null }) {
  let cat = null;
  if (id) cat = await Category.findById(id).lean();
  else if (slug) cat = await Category.findOne({ slug }).lean();
  if (!cat) return [];

  const chain = [cat.slug];
  let guard = 0;
  while (cat?.parent && guard < 10) {
    cat = await Category.findById(cat.parent).lean();
    if (!cat) break;
    chain.unshift(cat.slug);
    guard++;
  }
  return chain;
}
