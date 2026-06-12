// اجرای دمو بدون نیاز به MongoDB نصب‌شده:
// یک MongoDB واقعی درون‌حافظه‌ای بالا می‌آورد، seed می‌کند و سپس API را اجرا می‌کند.
// استفاده: npm run dev:memory
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('nardeban');
console.log('🧪 In-memory MongoDB:', process.env.MONGO_URI);

const { connectDB } = await import('./config/db.js');
await connectDB();

const { default: Category } = await import('./models/Category.js');
const { default: User } = await import('./models/User.js');
const { default: Ad } = await import('./models/Ad.js');
const { seedCategories } = await import('./config/categories.data.js');
const { SAMPLE_ADS } = await import('./config/sample-ads.js');

const slugMap = await seedCategories(Category);
const demoUser = await User.create({ phone: '09120000000', name: 'کاربر نمونه', city: 'تهران' });

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
    owner: demoUser._id,
    contactPhone: demoUser.phone,
  }))
);
console.log(`✅ Seeded ${Object.keys(slugMap).length} categories + ${SAMPLE_ADS.length} ads`);

process.env.SKIP_DB_CONNECT = '1';
await import('./index.js');
