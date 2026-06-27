import dotenv from 'dotenv';
import mongoose from 'mongoose';
// بارگذاری .env.local (مثل server.js) — ترتیب: .env.local سپس .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { connectDB } from './db.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import { seedCategories } from './categories.data.js';
import { SAMPLE_ADS } from './sample-ads.js';

async function run() {
  await connectDB();

  await Promise.all([Category.deleteMany({}), Ad.deleteMany({})]);
  const slugMap = await seedCategories(Category);
  console.log(`✅ ${Object.keys(slugMap).length} categories (with children) seeded`);

  // 👑 ادمین: 09110000000 (در پروداکشن شماره خودتان را بگذارید)
  await User.findOneAndUpdate(
    { phone: '09110000000' },
    { phone: '09110000000', name: 'مدیر بفروش', city: 'تهران', role: 'admin' },
    { upsert: true }
  );

  const demoUser = await User.findOneAndUpdate(
    { phone: '09120000000' },
    { phone: '09120000000', name: 'کاربر نمونه', city: 'تهران' },
    { upsert: true, new: true }
  );

  const ads = SAMPLE_ADS.map((a) => ({
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
  }));
  await Ad.insertMany(ads);
  console.log(`✅ ${ads.length} sample ads seeded`);

  await mongoose.disconnect();
  console.log('Done.');
}

run();
