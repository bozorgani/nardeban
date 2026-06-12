// ساختار دسته‌بندی ۳ سطحی (بر اساس ساختار واقعی دیوار)
export const CATEGORY_TREE = [
  {
    name: 'املاک', slug: 'real-estate', icon: '🏠',
    children: [
      { name: 'فروش مسکونی', slug: 'residential-sell', children: [
        { name: 'آپارتمان', slug: 'apartment-sell' },
        { name: 'خانه و ویلا', slug: 'house-sell' },
        { name: 'زمین و کلنگی', slug: 'land-sell' },
      ]},
      { name: 'اجارهٔ مسکونی', slug: 'residential-rent', children: [
        { name: 'آپارتمان', slug: 'apartment-rent' },
        { name: 'خانه و ویلا', slug: 'house-rent' },
      ]},
      { name: 'فروش اداری و تجاری', slug: 'commercial-sell', children: [
        { name: 'مغازه و غرفه', slug: 'shop-sell' },
        { name: 'دفتر کار، اتاق اداری', slug: 'office-sell' },
        { name: 'صنعتی، کشاورزی و تجاری', slug: 'industrial-property-sell' },
      ]},
      { name: 'اجارهٔ اداری و تجاری', slug: 'commercial-rent', children: [
        { name: 'مغازه و غرفه', slug: 'shop-rent' },
        { name: 'دفتر کار، اتاق اداری', slug: 'office-rent' },
      ]},
      { name: 'اجارهٔ کوتاه‌مدت', slug: 'short-term-rent', children: [
        { name: 'آپارتمان و سوئیت', slug: 'suite-rent' },
        { name: 'ویلا و باغ', slug: 'villa-rent' },
      ]},
      { name: 'پروژه‌های ساخت‌وساز', slug: 'construction-projects' },
    ],
  },
  {
    name: 'وسایل نقلیه', slug: 'vehicles', icon: '🚗',
    children: [
      { name: 'خودرو', slug: 'cars', children: [
        { name: 'سواری و وانت', slug: 'light-cars' },
        { name: 'کلاسیک', slug: 'classic-cars' },
        { name: 'سنگین', slug: 'heavy-cars' },
        { name: 'اجاره‌ای', slug: 'rental-cars' },
      ]},
      { name: 'موتورسیکلت', slug: 'motorcycles' },
      { name: 'قطعات یدکی و لوازم جانبی', slug: 'car-parts' },
      { name: 'قایق و سایر وسایل نقلیه', slug: 'boats' },
    ],
  },
  {
    name: 'کالای دیجیتال', slug: 'digital', icon: '📱',
    children: [
      { name: 'موبایل و تبلت', slug: 'mobile-tablet', children: [
        { name: 'موبایل', slug: 'mobile-phones' },
        { name: 'تبلت', slug: 'tablets' },
        { name: 'لوازم جانبی موبایل و تبلت', slug: 'mobile-accessories' },
        { name: 'سیم‌کارت', slug: 'sim-cards' },
      ]},
      { name: 'رایانه', slug: 'computers', children: [
        { name: 'لپ‌تاپ', slug: 'laptops' },
        { name: 'رایانه رومیزی', slug: 'desktops' },
        { name: 'قطعات، مودم و تجهیزات شبکه', slug: 'computer-parts' },
        { name: 'پرینتر و اسکنر', slug: 'printers' },
      ]},
      { name: 'کنسول و بازی ویدیویی', slug: 'gaming', children: [
        { name: 'کنسول بازی', slug: 'game-consoles' },
        { name: 'بازی و لوازم جانبی', slug: 'games-accessories' },
      ]},
      { name: 'صوتی و تصویری', slug: 'audio-video', children: [
        { name: 'تلویزیون', slug: 'tvs' },
        { name: 'سیستم صوتی و هدفون', slug: 'audio-systems' },
        { name: 'دوربین عکاسی و فیلم‌برداری', slug: 'cameras' },
      ]},
      { name: 'تلفن رومیزی', slug: 'landline-phones' },
    ],
  },
  {
    name: 'خانه و آشپزخانه', slug: 'home-kitchen', icon: '🛋️',
    children: [
      { name: 'لوازم خانگی برقی', slug: 'appliances', children: [
        { name: 'یخچال و فریزر', slug: 'fridges' },
        { name: 'ماشین لباسشویی و ظرفشویی', slug: 'washing-machines' },
        { name: 'تهویه، سرمایش و گرمایش', slug: 'hvac' },
        { name: 'جاروبرقی و نظافت', slug: 'vacuum-cleaners' },
      ]},
      { name: 'مبلمان و صنایع چوب', slug: 'furniture', children: [
        { name: 'مبل و صندلی راحتی', slug: 'sofas' },
        { name: 'میز و صندلی', slug: 'tables-chairs' },
        { name: 'سرویس خواب و تخت', slug: 'beds' },
        { name: 'کمد، بوفه و کتابخانه', slug: 'closets' },
      ]},
      { name: 'ظروف و لوازم آشپزخانه', slug: 'kitchenware' },
      { name: 'فرش، گلیم و موکت', slug: 'carpets' },
      { name: 'لوازم دکوری و تزئینی', slug: 'decoration' },
      { name: 'تشک، روتختی و رختخواب', slug: 'bedding' },
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
      { name: 'نظافت و خدمات منزل', slug: 'cleaning-services' },
    ],
  },
  {
    name: 'وسایل شخصی', slug: 'personal', icon: '👕',
    children: [
      { name: 'کیف، کفش و لباس', slug: 'clothing', children: [
        { name: 'زنانه', slug: 'womens-clothing' },
        { name: 'مردانه', slug: 'mens-clothing' },
        { name: 'کیف و کفش', slug: 'bags-shoes' },
      ]},
      { name: 'زیورآلات و ساعت', slug: 'jewelry' },
      { name: 'آرایشی و بهداشتی', slug: 'cosmetics' },
      { name: 'کودک و نوزاد', slug: 'baby', children: [
        { name: 'لباس کودک', slug: 'baby-clothes' },
        { name: 'کالسکه و لوازم جانبی', slug: 'strollers' },
        { name: 'اسباب‌بازی', slug: 'toys' },
      ]},
    ],
  },
  {
    name: 'سرگرمی و فراغت', slug: 'leisure', icon: '🎮',
    children: [
      { name: 'بلیط و تور', slug: 'tickets-tours' },
      { name: 'کتاب و مجله', slug: 'books' },
      { name: 'دوچرخه و اسکیت', slug: 'bicycles' },
      { name: 'حیوانات', slug: 'pets', children: [
        { name: 'پرنده', slug: 'birds' },
        { name: 'گربه', slug: 'cats' },
        { name: 'ماهی و آبزیان', slug: 'fish' },
        { name: 'لوازم حیوانات', slug: 'pet-supplies' },
      ]},
      { name: 'آلات موسیقی', slug: 'music-instruments' },
      { name: 'ورزش و تناسب اندام', slug: 'sports' },
      { name: 'کلکسیون و سرگرمی', slug: 'collections' },
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
      { name: 'تجهیزات کسب‌وکار', slug: 'business-equipment', children: [
        { name: 'فروشگاه و مغازه', slug: 'store-equipment' },
        { name: 'رستوران و کافی‌شاپ', slug: 'restaurant-equipment' },
        { name: 'پزشکی و آزمایشگاهی', slug: 'medical-equipment' },
      ]},
      { name: 'عمده‌فروشی', slug: 'wholesale' },
      { name: 'ابزارآلات', slug: 'tools' },
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
      { name: 'درمانی و سلامت', slug: 'health-jobs' },
    ],
  },
];

// درج بازگشتی (هر عمقی) و برگرداندن نگاشت slug → _id
export async function seedCategories(Category) {
  const slugMap = {};
  async function insert(node, parentId, icon) {
    const doc = await Category.create({
      name: node.name,
      slug: node.slug,
      icon: node.icon || icon,
      parent: parentId,
    });
    slugMap[node.slug] = doc._id;
    for (const child of node.children || []) {
      await insert(child, doc._id, node.icon || icon);
    }
  }
  for (const main of CATEGORY_TREE) await insert(main, null, main.icon);
  return slugMap;
}
