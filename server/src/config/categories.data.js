// ساختار کامل دسته‌بندی‌ها با زیردسته‌ها (شبیه دیوار)
export const CATEGORY_TREE = [
  {
    name: 'املاک', slug: 'real-estate', icon: '🏠',
    children: [
      { name: 'فروش مسکونی', slug: 'residential-sell' },
      { name: 'اجاره مسکونی', slug: 'residential-rent' },
      { name: 'فروش اداری و تجاری', slug: 'commercial-sell' },
      { name: 'اجاره اداری و تجاری', slug: 'commercial-rent' },
      { name: 'اجاره کوتاه‌مدت', slug: 'short-term-rent' },
      { name: 'زمین و کلنگی', slug: 'land' },
    ],
  },
  {
    name: 'وسایل نقلیه', slug: 'vehicles', icon: '🚗',
    children: [
      { name: 'خودرو سواری', slug: 'cars' },
      { name: 'موتورسیکلت', slug: 'motorcycles' },
      { name: 'قطعات یدکی و لوازم جانبی', slug: 'car-parts' },
      { name: 'خودروی سنگین', slug: 'heavy-vehicles' },
    ],
  },
  {
    name: 'کالای دیجیتال', slug: 'digital', icon: '📱',
    children: [
      { name: 'موبایل', slug: 'mobile-phones' },
      { name: 'تبلت', slug: 'tablets' },
      { name: 'لپ‌تاپ و رایانه', slug: 'computers' },
      { name: 'کنسول و بازی ویدیویی', slug: 'gaming' },
      { name: 'صوتی و تصویری', slug: 'audio-video' },
      { name: 'لوازم جانبی', slug: 'digital-accessories' },
    ],
  },
  {
    name: 'خانه و آشپزخانه', slug: 'home-kitchen', icon: '🛋️',
    children: [
      { name: 'مبلمان و صندلی', slug: 'furniture' },
      { name: 'لوازم خانگی برقی', slug: 'appliances' },
      { name: 'ظروف و لوازم آشپزخانه', slug: 'kitchenware' },
      { name: 'دکوراسیون و آینه', slug: 'decoration' },
      { name: 'فرش و گلیم', slug: 'carpets' },
    ],
  },
  {
    name: 'خدمات', slug: 'services', icon: '🛠️',
    children: [
      { name: 'آموزشی', slug: 'education' },
      { name: 'پیشه و مهارت', slug: 'craftsmen' },
      { name: 'حمل و نقل', slug: 'transport' },
      { name: 'آرایشگری و زیبایی', slug: 'beauty-services' },
      { name: 'مراسم و تشریفات', slug: 'events-services' },
    ],
  },
  {
    name: 'وسایل شخصی', slug: 'personal', icon: '👕',
    children: [
      { name: 'کیف، کفش و لباس', slug: 'clothing' },
      { name: 'زیورآلات و ساعت', slug: 'jewelry' },
      { name: 'آرایشی و بهداشتی', slug: 'cosmetics' },
      { name: 'کودک و نوزاد', slug: 'baby' },
    ],
  },
  {
    name: 'سرگرمی و فراغت', slug: 'leisure', icon: '🎮',
    children: [
      { name: 'بلیط و تور', slug: 'tickets-tours' },
      { name: 'کتاب و مجله', slug: 'books' },
      { name: 'دوچرخه و اسکیت', slug: 'bicycles' },
      { name: 'حیوانات', slug: 'pets' },
      { name: 'آلات موسیقی', slug: 'music-instruments' },
      { name: 'ورزش و تناسب اندام', slug: 'sports' },
    ],
  },
  {
    name: 'اجتماعی', slug: 'community', icon: '👥',
    children: [
      { name: 'رویداد', slug: 'events' },
      { name: 'کار داوطلبانه', slug: 'volunteers' },
      { name: 'گمشده‌ها', slug: 'lost-found' },
    ],
  },
  {
    name: 'تجهیزات و صنعتی', slug: 'industrial', icon: '🏭',
    children: [
      { name: 'ماشین‌آلات صنعتی', slug: 'machinery' },
      { name: 'تجهیزات کسب‌وکار', slug: 'business-equipment' },
      { name: 'عمده‌فروشی', slug: 'wholesale' },
    ],
  },
  {
    name: 'استخدام و کاریابی', slug: 'jobs', icon: '💼',
    children: [
      { name: 'اداری و مدیریت', slug: 'admin-jobs' },
      { name: 'فنی و مهندسی', slug: 'engineering-jobs' },
      { name: 'آی‌تی و نرم‌افزار', slug: 'it-jobs' },
      { name: 'فروش و بازاریابی', slug: 'sales-jobs' },
      { name: 'خدماتی', slug: 'service-jobs' },
    ],
  },
];

// درج در دیتابیس و برگرداندن نگاشت slug → _id
export async function seedCategories(Category) {
  const slugMap = {};
  for (const main of CATEGORY_TREE) {
    const parent = await Category.create({ name: main.name, slug: main.slug, icon: main.icon });
    slugMap[main.slug] = parent._id;
    for (const child of main.children || []) {
      const c = await Category.create({
        name: child.name,
        slug: child.slug,
        icon: main.icon,
        parent: parent._id,
      });
      slugMap[child.slug] = c._id;
    }
  }
  return slugMap;
}
