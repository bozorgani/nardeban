import SavedSearch from './models/SavedSearch.js';
import Ad from './models/Ad.js';
import { sendPushToUser } from './push.js';
import { buildFilter } from './routes/savedSearch.routes.js';

/**
 * چکر دوره‌ای جستجوهای ذخیره‌شده:
 * هر ۱۰ دقیقه، برای هر جستجوی notify=true اگر آگهی جدیدی بعد از آخرین اعلان
 * منتشر شده باشد، یک Web Push می‌فرستد (حداکثر یک اعلان per جستجو per ساعت).
 */
const CHECK_INTERVAL = 10 * 60 * 1000; // ۱۰ دقیقه
const MIN_NOTIFY_GAP = 60 * 60 * 1000; // حداقل فاصله بین دو اعلان یک جستجو

async function checkOnce() {
  const searches = await SavedSearch.find({ notify: true }).lean();
  for (const s of searches) {
    try {
      // فاصله از آخرین اعلان رعایت شود
      if (s.lastNotifiedAt && Date.now() - new Date(s.lastNotifiedAt).getTime() < MIN_NOTIFY_GAP)
        continue;

      const since = s.lastNotifiedAt || s.lastCheckedAt || s.createdAt;
      const filter = await buildFilter(s, catIndex);
      filter.createdAt = { $gt: since };

      const count = await Ad.countDocuments(filter);
      if (count === 0) continue;

      const sp = new URLSearchParams();
      if (s.query) sp.set('q', s.query);
      if (s.category) sp.set('category', s.category);
      if (s.city) sp.set('city', s.city);

      await sendPushToUser(s.user, {
        title: '🔍 آگهی جدید مطابق جستجوی شما',
        body: `${count.toLocaleString('fa-IR')} آگهی جدید برای «${s.label}»`,
        tag: `search-${s._id}`,
        url: `/?${sp.toString()}`,
      });

      await SavedSearch.updateOne({ _id: s._id }, { lastNotifiedAt: new Date() });
    } catch {
      /* یک جستجوی خراب نباید بقیه را متوقف کند */
    }
  }
}

export function startSavedSearchNotifier() {
  setInterval(() => checkOnce().catch(() => {}), CHECK_INTERVAL);
  // اولین چک ۱ دقیقه بعد از استارت
  setTimeout(() => checkOnce().catch(() => {}), 60 * 1000);
  console.log('🔔 SavedSearch notifier started (every 10min)');
}
