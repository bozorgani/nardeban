/**
 * seed داده‌های دمو (دسته‌بندی + آگهی نمونه + کاربر/ادمین دمو).
 * برای حالت dev:memory — همان منطق dev-server.js قبلی، اما به‌صورت تابع قابل فراخوانی.
 */
import Category from '../models/Category.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import { seedCategories } from './categories.data.js';
import { SAMPLE_ADS } from './sample-ads.js';

export async function seedDemoData() {
  // پاکسازی احتیاطی (در حالت memory دیتابیس تازه است، ولی برای امنیت)
  await Promise.all([Category.deleteMany({}), Ad.deleteMany({})]);

  const slugMap = await seedCategories(Category);

  const demoUser = await User.create({ phone: '09120000000', name: 'کاربر نمونه', city: 'تهران' });
  // 👑 ادمین دمو: 09110000000
  await User.create({ phone: '09110000000', name: 'مدیر بفروش', city: 'تهران', role: 'admin' });

  await Ad.insertMany(
    SAMPLE_ADS.map((a) => ({
      title: a.title,
      description: a.description,
      price: a.price,
      isFree: false,
      category: slugMap[a.catSlug],
      city: a.city,
      neighborhood: a.neighborhood,
      location: { lat: a.lat || null, lng: a.lng || null },
      images: [],
      status: 'active',
      owner: demoUser._id,
      contactPhone: demoUser.phone,
    }))
  );

  console.log(`✅ Seeded ${Object.keys(slugMap).length} categories + ${SAMPLE_ADS.length} ads`);

  // داده انبوه برای تست infinite scroll:  SEED_BULK=300 npm run dev:memory
  const bulk = parseInt(process.env.SEED_BULK || '0', 10);
  if (bulk > 0) {
    const catIds = Object.values(slugMap);
    const cities = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'قم', 'رشت'];
    const docs = Array.from({ length: bulk }, (_, i) => ({
      title: `آگهی تستی شماره ${i + 1} — کالای نمونه`,
      description: `توضیحات آگهی تستی شماره ${i + 1} برای آزمایش اسکرول بی‌نهایت و صفحه‌بندی.`,
      price: (i % 10) * 1000000 + 500000,
      isFree: false,
      category: catIds[i % catIds.length],
      city: cities[i % cities.length],
      neighborhood: '',
      images: [],
      status: 'active',
      owner: demoUser._id,
      contactPhone: demoUser.phone,
      createdAt: new Date(Date.now() - i * 60000),
    }));
    await Ad.insertMany(docs);
    console.log(`✅ Bulk seeded ${bulk} test ads`);
  }
}
