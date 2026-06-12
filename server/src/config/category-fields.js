/**
 * فیلدها و فیلترهای اختصاصی هر دسته (سبک دیوار)
 * کلید = slug دسته سطح ۱ (به همه نوادگان اعمال می‌شود)
 * انواع: select | number | year
 * مقادیر در Ad.attrs (Map) ذخیره می‌شوند.
 */
export const CATEGORY_FIELDS = {
  vehicles: [
    {
      key: 'brand', label: 'برند', type: 'select',
      options: ['پراید', 'پژو', 'سمند', 'تیبا', 'کوییک', 'دنا', 'شاهین', 'تارا', 'رنو', 'کیا', 'هیوندای', 'تویوتا', 'نیسان', 'مزدا', 'ام‌وی‌ام', 'چری', 'جک', 'هوندا', 'سایر'],
      filter: true,
    },
    { key: 'year', label: 'سال ساخت', type: 'year', min: 1360, max: 1404, filter: true },
    { key: 'mileage', label: 'کارکرد (km)', type: 'number', unit: 'کیلومتر', filter: true },
    {
      key: 'gearbox', label: 'گیربکس', type: 'select',
      options: ['دنده‌ای', 'اتوماتیک'], filter: true,
    },
    {
      key: 'fuel', label: 'سوخت', type: 'select',
      options: ['بنزین', 'دوگانه‌سوز', 'گاز (CNG)', 'دیزل', 'هیبرید', 'برقی'], filter: false,
    },
    {
      key: 'bodyStatus', label: 'وضعیت بدنه', type: 'select',
      options: ['سالم و بی‌رنگ', 'خط و خش جزئی', 'صافکاری بی‌رنگ', 'رنگ‌شدگی', 'دوررنگ', 'تمام‌رنگ', 'تصادفی'], filter: false,
    },
  ],
  'real-estate': [
    { key: 'area', label: 'متراژ', type: 'number', unit: 'متر', filter: true },
    {
      key: 'rooms', label: 'تعداد اتاق', type: 'select',
      options: ['بدون اتاق', '۱', '۲', '۳', '۴', '۵ یا بیشتر'], filter: true,
    },
    { key: 'buildYear', label: 'سال ساخت', type: 'year', min: 1360, max: 1404, filter: false },
    { key: 'deposit', label: 'ودیعه (تومان)', type: 'number', unit: 'تومان', filter: true, rentOnly: true },
    { key: 'rent', label: 'اجارهٔ ماهانه (تومان)', type: 'number', unit: 'تومان', filter: true, rentOnly: true },
    {
      key: 'elevator', label: 'آسانسور', type: 'select',
      options: ['دارد', 'ندارد'], filter: false,
    },
    {
      key: 'parking', label: 'پارکینگ', type: 'select',
      options: ['دارد', 'ندارد'], filter: false,
    },
  ],
  digital: [
    {
      key: 'brand', label: 'برند', type: 'select',
      options: ['سامسونگ', 'اپل', 'شیائومی', 'هواوی', 'نوکیا', 'ال‌جی', 'سونی', 'ایسوس', 'لنوو', 'اچ‌پی', 'دل', 'مایکروسافت', 'سایر'],
      filter: true,
    },
    {
      key: 'storage', label: 'حافظه', type: 'select',
      options: ['۳۲ گیگ', '۶۴ گیگ', '۱۲۸ گیگ', '۲۵۶ گیگ', '۵۱۲ گیگ', '۱ ترابایت یا بیشتر'], filter: true,
    },
    {
      key: 'ram', label: 'رم', type: 'select',
      options: ['۲', '۳', '۴', '۶', '۸', '۱۲', '۱۶ یا بیشتر'], filter: false,
    },
  ],
};

// پیدا کردن slug ریشه (سطح ۱) برای یک دسته با پیمایش والدها
export async function findRootSlug(Category, categoryId) {
  let cat = await Category.findById(categoryId).lean();
  let guard = 0;
  while (cat?.parent && guard < 10) {
    cat = await Category.findById(cat.parent).lean();
    guard++;
  }
  return cat?.slug || null;
}
