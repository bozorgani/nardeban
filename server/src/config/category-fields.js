/**
 * فیلدها و فیلترهای اختصاصی دسته‌ها (سبک دیوار) — per-subcategory با ارث‌بری (merge)
 * ----------------------------------------------------------------------------
 * کلید = slug هر دسته در «هر سطحی» (ریشه/میانی/برگ).
 * فیلدهای یک دسته = ترکیب فیلدهای همهٔ اجداد (از ریشه) + فیلدهای خودش.
 *   - ارث‌بری: زیردسته فیلدهای والد را می‌گیرد و فیلدهای خودش را اضافه می‌کند.
 *   - override: اگر زیردسته فیلدی با همان key والد تعریف کند، نسخهٔ نزدیک‌تر به برگ برنده است.
 *
 * انواع فیلد:
 *   - select : لیست گزینه‌ها (options)
 *   - number : عدد (unit برچسب) — قابل فیلتر بازه‌ای (min/max)
 *   - year   : سال شمسی (min/max)
 * پرچم filter:true یعنی در نوار فیلتر جستجو هم نمایش داده شود.
 * مقادیر در Ad.attrs (Map) ذخیره می‌شوند.
 */

const YES_NO = ['دارد', 'ندارد'];
const COND = ['نو / آکبند', 'در حد نو', 'کارکرده', 'نیاز به تعمیر'];

export const CATEGORY_FIELDS = {
  /* ====================================================================== */
  /*  املاک (real-estate)                                                    */
  /* ====================================================================== */
  'real-estate': [
    { key: 'area', label: 'متراژ', type: 'number', unit: 'متر', filter: true },
    { key: 'buildYear', label: 'سال ساخت', type: 'year', min: 1330, max: 1404, filter: false },
    { key: 'rooms', label: 'تعداد اتاق', type: 'select', options: ['بدون اتاق', '۱', '۲', '۳', '۴', '۵ یا بیشتر'], filter: true },
    { key: 'elevator', label: 'آسانسور', type: 'select', options: YES_NO, filter: false },
    { key: 'parking', label: 'پارکینگ', type: 'select', options: YES_NO, filter: false },
    { key: 'storeroom', label: 'انباری', type: 'select', options: YES_NO, filter: false },
  ],
  // فروش مسکونی → قیمت کل
  'residential-sell': [
    { key: 'totalPrice', label: 'قیمت کل (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'floor', label: 'طبقه', type: 'select', options: ['زیرزمین', 'همکف', '۱', '۲', '۳', '۴', '۵', '۶ یا بیشتر'], filter: false },
  ],
  'land-sell': [
    // زمین: حذف فیلدهای ساختمانی ارث‌بری‌شده (اتاق/آسانسور/پارکینگ/انباری/سال‌ساخت)
    { omit: ['rooms', 'elevator', 'parking', 'storeroom', 'buildYear', 'floor'] },
    { key: 'landUse', label: 'کاربری', type: 'select', options: ['مسکونی', 'تجاری', 'کشاورزی', 'باغ', 'صنعتی'], filter: true },
    { key: 'totalPrice', label: 'قیمت کل (تومان)', type: 'number', unit: 'تومان', filter: true },
  ],
  // اجارهٔ مسکونی → ودیعه و اجاره
  'residential-rent': [
    { key: 'deposit', label: 'ودیعه (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'rent', label: 'اجارهٔ ماهانه (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'floor', label: 'طبقه', type: 'select', options: ['زیرزمین', 'همکف', '۱', '۲', '۳', '۴', '۵', '۶ یا بیشتر'], filter: false },
  ],
  // اداری و تجاری (فروش) → متراژ + قیمت، بدون اتاق
  'commercial-sell': [
    { key: 'totalPrice', label: 'قیمت کل (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'propertyType', label: 'نوع ملک', type: 'select', options: ['مغازه', 'دفتر کار', 'سوله/انبار', 'سایر'], filter: true },
  ],
  'commercial-rent': [
    { key: 'deposit', label: 'ودیعه (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'rent', label: 'اجارهٔ ماهانه (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'propertyType', label: 'نوع ملک', type: 'select', options: ['مغازه', 'دفتر کار', 'سوله/انبار', 'سایر'], filter: true },
  ],
  'short-term-rent': [
    { key: 'rentDaily', label: 'اجارهٔ شبانه (تومان)', type: 'number', unit: 'تومان', filter: true },
    { key: 'capacity', label: 'ظرفیت (نفر)', type: 'select', options: ['۱-۲', '۳-۴', '۵-۶', '۷-۱۰', 'بیشتر از ۱۰'], filter: true },
  ],

  /* ====================================================================== */
  /*  وسایل نقلیه (vehicles)                                                 */
  /* ====================================================================== */
  vehicles: [
    { key: 'year', label: 'سال ساخت', type: 'year', min: 1350, max: 1404, filter: true },
    { key: 'mileage', label: 'کارکرد', type: 'number', unit: 'کیلومتر', filter: true },
    { key: 'bodyStatus', label: 'وضعیت بدنه', type: 'select', options: ['سالم و بی‌رنگ', 'خط و خش جزئی', 'صافکاری بی‌رنگ', 'رنگ‌شدگی', 'دوررنگ', 'تمام‌رنگ', 'تصادفی'], filter: false },
  ],
  cars: [
    { key: 'brand', label: 'برند', type: 'select', options: ['پراید', 'پژو', 'سمند', 'تیبا', 'کوییک', 'دنا', 'شاهین', 'تارا', 'رنو', 'کیا', 'هیوندای', 'تویوتا', 'نیسان', 'مزدا', 'ام‌وی‌ام', 'چری', 'جک', 'هوندا', 'بنز', 'بی‌ام‌و', 'سایر'], filter: true },
    { key: 'gearbox', label: 'گیربکس', type: 'select', options: ['دنده‌ای', 'اتوماتیک'], filter: true },
    { key: 'fuel', label: 'سوخت', type: 'select', options: ['بنزین', 'دوگانه‌سوز', 'گاز (CNG)', 'دیزل', 'هیبرید', 'برقی'], filter: false },
    { key: 'color', label: 'رنگ', type: 'select', options: ['سفید', 'مشکی', 'نقره‌ای', 'خاکستری', 'نوک‌مدادی', 'قرمز', 'آبی', 'سایر'], filter: false },
  ],
  'heavy-cars': [
    { key: 'truckType', label: 'نوع', type: 'select', options: ['کامیون', 'کامیونت', 'اتوبوس', 'مینی‌بوس', 'کشنده', 'ماشین‌آلات راه‌سازی'], filter: true },
  ],
  motorcycles: [
    { key: 'brand', label: 'برند', type: 'select', options: ['هوندا', 'یاماها', 'سوزوکی', 'کاوازاکی', 'باجاج', 'کی‌تی‌ام', 'بنلی', 'متفرقه', 'سایر'], filter: true },
    { key: 'year', label: 'سال ساخت', type: 'year', min: 1360, max: 1404, filter: true },
    { key: 'mileage', label: 'کارکرد', type: 'number', unit: 'کیلومتر', filter: true },
    { key: 'engineCc', label: 'حجم موتور (cc)', type: 'select', options: ['۵۰', '۱۰۰', '۱۲۵', '۱۵۰', '۲۰۰', '۲۵۰ یا بیشتر'], filter: true },
  ],
  'car-parts': [
    { key: 'partCondition', label: 'وضعیت', type: 'select', options: ['نو', 'استوک', 'دست دوم'], filter: true },
  ],
  boats: [
    { key: 'vehicleKind', label: 'نوع وسیله', type: 'select', options: ['قایق', 'جت‌اسکی', 'کاروان', 'سایر'], filter: true },
  ],

  /* ====================================================================== */
  /*  کالای دیجیتال (digital)                                                */
  /* ====================================================================== */
  digital: [
    { key: 'condition2', label: 'وضعیت', type: 'select', options: COND, filter: true },
  ],
  // موبایل
  'mobile-phones': [
    { key: 'brand', label: 'برند', type: 'select', options: ['سامسونگ', 'اپل', 'شیائومی', 'هواوی', 'نوکیا', 'ال‌جی', 'سونی', 'وان‌پلاس', 'گوگل', 'موتورولا', 'سایر'], filter: true },
    { key: 'storage', label: 'حافظهٔ داخلی', type: 'select', options: ['۱۶ گیگ', '۳۲ گیگ', '۶۴ گیگ', '۱۲۸ گیگ', '۲۵۶ گیگ', '۵۱۲ گیگ', '۱ ترابایت یا بیشتر'], filter: true },
    { key: 'ram', label: 'رم', type: 'select', options: ['۲', '۳', '۴', '۶', '۸', '۱۲', '۱۶ یا بیشتر'], filter: false },
  ],
  tablets: [
    { key: 'brand', label: 'برند', type: 'select', options: ['سامسونگ', 'اپل', 'شیائومی', 'هواوی', 'لنوو', 'سایر'], filter: true },
    { key: 'storage', label: 'حافظهٔ داخلی', type: 'select', options: ['۳۲ گیگ', '۶۴ گیگ', '۱۲۸ گیگ', '۲۵۶ گیگ', '۵۱۲ گیگ یا بیشتر'], filter: true },
    { key: 'connectivity', label: 'اتصال', type: 'select', options: ['Wi-Fi', 'Wi-Fi + سیم‌کارت'], filter: false },
  ],
  'sim-cards': [
    { key: 'operator', label: 'اپراتور', type: 'select', options: ['همراه اول', 'ایرانسل', 'رایتل', 'شاتل'], filter: true },
    { key: 'simType', label: 'نوع سیم‌کارت', type: 'select', options: ['دائمی', 'اعتباری'], filter: true },
  ],
  // رایانه
  laptops: [
    { key: 'brand', label: 'برند', type: 'select', options: ['ایسوس', 'لنوو', 'اچ‌پی', 'دل', 'اپل', 'ام‌اس‌آی', 'ایسر', 'مایکروسافت', 'سایر'], filter: true },
    { key: 'cpu', label: 'پردازنده', type: 'select', options: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Apple M', 'سایر'], filter: true },
    { key: 'ram', label: 'رم', type: 'select', options: ['۴', '۸', '۱۶', '۳۲', '۶۴ یا بیشتر'], filter: true },
    { key: 'storage', label: 'حافظه', type: 'select', options: ['HDD ۵۰۰', 'HDD ۱ ترابایت', 'SSD ۱۲۸', 'SSD ۲۵۶', 'SSD ۵۱۲', 'SSD ۱ ترابایت یا بیشتر'], filter: false },
    { key: 'gpu', label: 'کارت گرافیک', type: 'select', options: ['اشتراکی (داخلی)', 'مجزا'], filter: false },
  ],
  desktops: [
    { key: 'cpu', label: 'پردازنده', type: 'select', options: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'سایر'], filter: true },
    { key: 'ram', label: 'رم', type: 'select', options: ['۴', '۸', '۱۶', '۳۲', '۶۴ یا بیشتر'], filter: true },
    { key: 'gpu', label: 'کارت گرافیک', type: 'select', options: ['اشتراکی (داخلی)', 'مجزا'], filter: false },
  ],
  // کنسول بازی
  'game-consoles': [
    { key: 'brand', label: 'برند', type: 'select', options: ['پلی‌استیشن', 'ایکس‌باکس', 'نینتندو', 'سایر'], filter: true },
    { key: 'model', label: 'مدل', type: 'select', options: ['PS5', 'PS4', 'PS3', 'Xbox Series', 'Xbox One', 'Nintendo Switch', 'سایر'], filter: true },
  ],
  // صوتی و تصویری
  tvs: [
    { key: 'brand', label: 'برند', type: 'select', options: ['سامسونگ', 'ال‌جی', 'سونی', 'شیائومی', 'تی‌سی‌ال', 'اسنوا', 'جی‌پلاس', 'سایر'], filter: true },
    { key: 'screenSize', label: 'اندازهٔ صفحه (اینچ)', type: 'select', options: ['۳۲', '۴۳', '۵۰', '۵۵', '۶۵', '۷۵ یا بیشتر'], filter: true },
    { key: 'resolution', label: 'کیفیت', type: 'select', options: ['HD', 'Full HD', '4K', '8K'], filter: false },
  ],
  cameras: [
    { key: 'brand', label: 'برند', type: 'select', options: ['کانن', 'نیکون', 'سونی', 'فوجی', 'پاناسونیک', 'سایر'], filter: true },
    { key: 'cameraType', label: 'نوع', type: 'select', options: ['DSLR', 'بدون آینه (Mirrorless)', 'کامپکت', 'فیلم‌برداری'], filter: true },
  ],

  /* ====================================================================== */
  /*  خانه و آشپزخانه (home-kitchen)                                         */
  /* ====================================================================== */
  'home-kitchen': [
    { key: 'condition2', label: 'وضعیت', type: 'select', options: COND, filter: true },
  ],
  appliances: [
    { key: 'brand', label: 'برند', type: 'select', options: ['اسنوا', 'ال‌جی', 'سامسونگ', 'بوش', 'پاکشوما', 'امرسان', 'دوو', 'هیمالیا', 'سایر'], filter: true },
  ],
  fridges: [
    { key: 'fridgeType', label: 'نوع', type: 'select', options: ['ساید بای ساید', 'دوقلو', 'یخچال فریزر', 'تک', 'فریزر صندوقی'], filter: true },
  ],
  furniture: [
    { key: 'material', label: 'جنس', type: 'select', options: ['چوب', 'ام‌دی‌اف', 'فلز', 'پلاستیک', 'سایر'], filter: false },
  ],
  carpets: [
    { key: 'carpetType', label: 'نوع', type: 'select', options: ['ماشینی', 'دستباف', 'گلیم', 'موکت'], filter: true },
    { key: 'carpetSize', label: 'اندازه', type: 'select', options: ['۶ متری', '۹ متری', '۱۲ متری', 'قالیچه', 'سایر'], filter: true },
  ],

  /* ====================================================================== */
  /*  خدمات (services) — قیمت معمولاً توافقی؛ نوع همکاری مهم است             */
  /* ====================================================================== */
  services: [
    { key: 'serviceMode', label: 'نحوهٔ ارائه', type: 'select', options: ['حضوری', 'غیرحضوری/آنلاین', 'هر دو'], filter: true },
  ],

  /* ====================================================================== */
  /*  وسایل شخصی (personal)                                                  */
  /* ====================================================================== */
  personal: [
    { key: 'condition2', label: 'وضعیت', type: 'select', options: ['نو / استفاده‌نشده', 'در حد نو', 'کارکرده'], filter: true },
  ],
  clothing: [
    { key: 'clothingSize', label: 'سایز', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'فری‌سایز'], filter: true },
  ],
  'bags-shoes': [
    { key: 'shoeSize', label: 'سایز کفش', type: 'select', options: ['۳۶', '۳۷', '۳۸', '۳۹', '۴۰', '۴۱', '۴۲', '۴۳', '۴۴', '۴۵'], filter: true },
  ],
  jewelry: [
    { key: 'jewelryMaterial', label: 'جنس', type: 'select', options: ['طلا', 'نقره', 'بدلیجات', 'جواهر', 'سایر'], filter: true },
  ],

  /* ====================================================================== */
  /*  سرگرمی و فراغت (leisure)                                               */
  /* ====================================================================== */
  bicycles: [
    { key: 'bikeType', label: 'نوع', type: 'select', options: ['کوهستان', 'شهری', 'کورسی', 'بچگانه', 'برقی', 'اسکیت'], filter: true },
    { key: 'frameSize', label: 'سایز طوقه', type: 'select', options: ['۱۲', '۱۶', '۲۰', '۲۴', '۲۶', '۲۷.۵', '۲۹'], filter: false },
  ],
  pets: [
    { key: 'petAge', label: 'سن', type: 'select', options: ['زیر ۶ ماه', '۶ ماه تا ۱ سال', '۱ تا ۳ سال', 'بالای ۳ سال'], filter: false },
  ],
  'music-instruments': [
    { key: 'instrumentType', label: 'نوع ساز', type: 'select', options: ['گیتار', 'پیانو/کیبورد', 'تار/سه‌تار', 'سنتور', 'ویولن', 'کاخن/سازکوبه‌ای', 'بادی', 'سایر'], filter: true },
  ],
  sports: [
    { key: 'sportType', label: 'نوع', type: 'select', options: ['بدنسازی', 'دوچرخهٔ ثابت/تردمیل', 'کوهنوردی', 'فوتبال', 'رزمی', 'سایر'], filter: true },
  ],

  /* ====================================================================== */
  /*  تجهیزات و صنعتی (industrial)                                           */
  /* ====================================================================== */
  industrial: [
    { key: 'condition2', label: 'وضعیت', type: 'select', options: ['نو', 'کارکرده'], filter: true },
  ],
  tools: [
    { key: 'toolPower', label: 'منبع نیرو', type: 'select', options: ['برقی', 'شارژی', 'بنزینی', 'دستی', 'بادی'], filter: true },
  ],

  /* ====================================================================== */
  /*  استخدام و کاریابی (jobs) — فیلدهای شغلی                                */
  /* ====================================================================== */
  jobs: [
    { key: 'jobType', label: 'نوع همکاری', type: 'select', options: ['تمام‌وقت', 'پاره‌وقت', 'پروژه‌ای', 'دورکاری', 'کارآموزی'], filter: true },
    { key: 'gender', label: 'جنسیت', type: 'select', options: ['فرقی ندارد', 'آقا', 'خانم'], filter: false },
    { key: 'experience', label: 'سابقهٔ کار', type: 'select', options: ['بدون نیاز به سابقه', 'کمتر از ۲ سال', '۲ تا ۵ سال', 'بیش از ۵ سال'], filter: true },
    { key: 'salary', label: 'حقوق ماهانه (تومان)', type: 'number', unit: 'تومان', filter: false },
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
    for (const f of defs) {
      // پشتیبانی از حذف فیلدهای ارث‌بری‌شده: { omit: ['key1','key2'] }
      if (Array.isArray(f.omit)) {
        for (const k of f.omit) byKey.delete(k);
        continue;
      }
      byKey.set(f.key, f); // override: نزدیک‌ترین به برگ برنده
    }
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
