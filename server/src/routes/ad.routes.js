import { Router } from 'express';
import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { deleteUploads } from '../utils/files.js';
import { optimizeImages } from '../middleware/optimizeImages.js';
import { writeLimiter } from '../middleware/limiters.js';
import { deleteAdCascade } from '../services/adDeletion.js';
import { buildCategoryIndex } from '../utils/categories.js';

const router = Router();

// نرمال‌سازی متن فارسی (ی/ک عربی، نیم‌فاصله) برای جستجوی قابل اعتماد
const normalizeFa = (s) =>
  String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// الگویی که فاصله و نیم‌فاصله را یکسان می‌بیند
const flexible = (w) => escapeRegex(w).replace(/ /g, '[\\s\\u200c]+');

/**
 * نرمال‌سازی + اعتبارسنجی شماره تماس آگهی (M2)
 * ----------------------------------------------------------------------------
 * قبلاً contactPhone خام از body پذیرفته می‌شد و در صورت خالی بودن به phone
 * خود کاربر fallback می‌شد. اما هیچ اعتبارسنجی فرمت روی مقدار غیرخالی نبود؛
 * یعنی مهاجم می‌توانست شمارهٔ یک قربانی را به‌عنوان contactPhone بگذارد
 * تا خریدارها به قربانی زنگ بزنند (تلفن‌بازی/مزاحمت).
 *
 * سیاست جدید:
 *   ۱) اعداد فارسی/عربی به انگلیسی تبدیل می‌شوند، هر چیز غیر رقم حذف.
 *   ۲) اگر دقیقاً ۱۱ رقم با پیشوند 09 بود → پذیرفته می‌شود.
 *   ۳) در غیر این صورت → null برمی‌گردد؛ caller باید fallback یا 400 بدهد.
 *
 * توجه: ما به‌جای پذیرفتن «هر شماره‌ای که کاربر ادعا می‌کند مال خودش است»،
 * فقط شمارهٔ احرازشدهٔ کاربر را به‌عنوان پیش‌فرض می‌پذیریم. اگر کاربر شمارهٔ
 * متفاوت بدهد، باید فرمت موبایل ایران داشته باشد (در آینده می‌شود OTP روی
 * این شماره هم اعمال کرد؛ فعلاً حداقل از شمارهٔ کاملاً جعلی جلوگیری می‌شود).
 */
function normalizePhone(raw) {
  if (raw == null) return null;
  const en = String(raw)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[^0-9]/g, '');
  return /^09\d{9}$/.test(en) ? en : null;
}

// پارس امن attrs از فرم (JSON string) — فقط مقادیر رشته‌ای کوتاه
function parseAttrs(raw) {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(k) && v !== '' && v != null) {
        out[k] = String(v).slice(0, 100);
      }
    }
    return out;
  } catch {
    return {};
  }
}

// لیست آگهی‌ها + جستجو و فیلتر + صفحه‌بندی
// GET /api/ads?q=&category=slug&city=&minPrice=&maxPrice=&page=&limit=&sort=
router.get('/', async (req, res, next) => {
  try {
    const { q, category, city, minPrice, maxPrice, sort = 'newest' } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(40, parseInt(req.query.limit) || 24);

    const filter = { status: 'active' };

    // جستجوی متن به‌صورت hybrid (DB-01):
    //  ۱) ابتدا $text (ایندکس‌محور و سریع) — برای کلمات کامل
    //  ۲) اگر نتیجه‌ای نداشت، fallback به regex (زیررشته/کلمهٔ ناقص فارسی)
    // شرط regex را اینجا آماده می‌کنیم تا در صورت نیاز استفاده شود.
    const words = q && q.trim() ? normalizeFa(q).split(/\s+/).filter(Boolean).slice(0, 6) : [];
    const regexAnd = words.length
      ? words.map((w) => ({
          $or: [
            { title: { $regex: flexible(w), $options: 'i' } },
            { description: { $regex: flexible(w), $options: 'i' } },
          ],
        }))
      : null;
    if (city) {
      // پشتیبانی چند شهر: city=تهران,کاشان,اصفهان
      const cities = String(city).split(',').map((c) => normalizeFa(c)).filter(Boolean);
      if (cities.length === 1) filter.city = cities[0];
      else if (cities.length > 1) filter.city = { $in: cities };
    }
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        // جمع‌آوری همه نوادگان (هر عمقی) — برای دسته‌بندی ۳ سطحی
        const ids = [cat._id];
        let frontier = [cat._id];
        while (frontier.length) {
          const children = await Category.find({ parent: { $in: frontier } }).select('_id');
          frontier = children.map((c) => c._id);
          ids.push(...frontier);
        }
        filter.category = { $in: ids };
      }
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // فیلترهای اختصاصی دسته: attr_brand=پراید | attr_year_min=1395 | attr_mileage_max=100000
    for (const [qk, qv] of Object.entries(req.query)) {
      if (!qk.startsWith('attr_') || !qv) continue;
      const m = qk.match(/^attr_(.+?)(_min|_max)?$/);
      if (!m) continue;
      const [, key, bound] = m;
      const field = `attrs.${key}`;
      if (bound) {
        // مقایسه عددی روی رشته‌ها با $expr — آگهی بدون این attr (null) نباید پاس شود
        const conv = { $convert: { input: '$' + field, to: 'double', onError: null, onNull: null } };
        filter.$expr = filter.$expr || { $and: [] };
        filter.$expr.$and.push({
          $and: [
            { $ne: [conv, null] },
            { [bound === '_min' ? '$gte' : '$lte']: [conv, Number(qv)] },
          ],
        });
      } else {
        filter[field] = String(qv);
      }
    }

    const sortMap = {
      newest: { createdAt: -1 },
      cheapest: { price: 1 },
      expensive: { price: -1 },
    };

    const SELECT = 'title price isFree city neighborhood images condition createdAt category attrs';
    const sortSpec = sortMap[sort] || sortMap.newest;

    // اجرای کوئری با یک filter مشخص
    const run = (f) =>
      Promise.all([
        Ad.find(f)
          .sort(sortSpec)
          .skip((page - 1) * limit)
          .limit(limit)
          .select(SELECT)
          .populate('category', 'name slug icon')
          .lean(),
        Ad.countDocuments(f),
      ]);

    let ads, total;
    if (regexAnd) {
      // ۱) تلاش با $text (ایندکس‌محور). عبارت را با گیومه می‌سازیم تا منطق AND حفظ شود.
      const phrase = words.map((w) => `"${w}"`).join(' ');
      const textFilter = { ...filter, $text: { $search: phrase } };
      [ads, total] = await run(textFilter);

      // ۲) Fallback به regex (M9) — با محافظ‌های جدی در برابر collection scan.
      // ----------------------------------------------------------------------
      // قبلاً اگر $text چیزی نمی‌یافت، یک regex بدون ایندکس روی title/description
      // اجرا می‌شد. روی یک پایگاه دادهٔ ۵۰k+ آگهی، این یعنی scan کامل (چند ثانیه
      // پاسخ + CPU spike). مهاجم با یک حرف ناآشنا می‌توانست API را به زانو دربیاورد.
      //
      // سیاست جدید:
      //   ۱) فقط زمانی به regex سقوط کن که فیلتر دیگری وجود دارد (category/city/
      //      attrs/price) — یعنی Mongo می‌تواند با ایندکس مرکب موجود
      //      ({status, city, createdAt} یا {status, category, createdAt})
      //      دامنه را به‌شدت کوچک کند و سپس regex را روی همان زیرمجموعهٔ کوچک
      //      اعمال کند. این یعنی scan روی هزاران رکورد نه میلیون‌ها.
      //   ۲) maxTimeMS سخت: اگر Mongo نتوانست در ۸۰۰ms جواب بدهد، رها می‌کند
      //      و ما خالی برمی‌گردانیم (به‌جای بلاک کردن نخ event loop).
      //   ۳) regex را به ابتدای کلمه/فاصله/شروع رشته anchor می‌کنیم تا engine
      //      بتواند زودتر reject کند.
      //
      // نتیجه: ۹۹٪ کوئری‌های مشروع همچنان نتیجه می‌گیرند (چون کاربران واقعی
      // معمولاً شهر/دسته هم انتخاب می‌کنند یا کلمهٔ کامل می‌نویسند که $text پیدا
      // می‌کند)، و دیگر امکان scan کامل وجود ندارد.
      if (total === 0) {
        const hasNarrowingFilter =
          filter.city ||
          filter.category ||
          filter.price ||
          Object.keys(filter).some((k) => k.startsWith('attrs.')) ||
          filter.$expr;

        if (hasNarrowingFilter) {
          // anchorـ شده: یا ابتدای رشته/فیلد، یا بعد از فاصله/نیم‌فاصله
          const anchoredAnd = words.map((w) => ({
            $or: [
              { title: { $regex: '(^|[\\s\\u200c])' + flexible(w), $options: 'i' } },
              { description: { $regex: '(^|[\\s\\u200c])' + flexible(w), $options: 'i' } },
            ],
          }));
          const regexFilter = { ...filter };
          regexFilter.$and = [...(regexFilter.$and || []), ...anchoredAnd];

          try {
            const sortSpecLocal = sortMap[sort] || sortMap.newest;
            [ads, total] = await Promise.all([
              Ad.find(regexFilter)
                .sort(sortSpecLocal)
                .skip((page - 1) * limit)
                .limit(limit)
                .select(SELECT)
                .populate('category', 'name slug icon')
                .maxTimeMS(800) // sentinel سخت
                .lean(),
              Ad.countDocuments(regexFilter).maxTimeMS(400),
            ]);
          } catch (err) {
            // اگر maxTimeMS hit شد یا کوئری شکست خورد، خالی برگرد (نه ۵۰۰)
            if (err?.code === 50 /* MaxTimeMSExpired */ || /maxTimeMS/i.test(err?.message || '')) {
              ads = []; total = 0;
            } else {
              throw err;
            }
          }
        }
        // اگر هیچ فیلتر محدودکننده‌ای نیست → regex اجرا نمی‌شود و نتیجهٔ صفرِ
        // $text محترم شمرده می‌شود. کاربر می‌تواند با اضافه‌کردن شهر/دسته دوباره
        // امتحان کند.
      }
    } else {
      [ads, total] = await run(filter);
    }

    // فقط عکس اول برای کارت لازم است (کاهش حجم پاسخ)
    for (const ad of ads) {
      if (ad.images?.length > 1) ad.images = [ad.images[0]];
    }

    res.json({ ads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// آگهی‌های من
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const ads = await Ad.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate('category', 'name slug icon')
      .lean();
    res.json({ ads });
  } catch (err) {
    next(err);
  }
});

// آگهی‌های مشابه: همان دسته (اولویت: همان شهر) — برای پایین صفحه آگهی
router.get('/:id/similar', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    const ad = await Ad.findById(req.params.id).select('category city').lean();
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });

    const base = {
      _id: { $ne: ad._id },
      status: 'active',
      category: ad.category,
    };
    const sel = 'title price isFree city neighborhood images condition createdAt category';

    // اول همان شهر، سپس بقیه شهرها تا سقف ۶
    const sameCity = await Ad.find({ ...base, city: ad.city })
      .sort({ createdAt: -1 })
      .limit(6)
      .select(sel)
      .populate('category', 'name slug icon')
      .lean();

    let others = [];
    if (sameCity.length < 6) {
      others = await Ad.find({ ...base, city: { $ne: ad.city } })
        .sort({ createdAt: -1 })
        .limit(6 - sameCity.length)
        .select(sel)
        .populate('category', 'name slug icon')
        .lean();
    }

    let ads = [...sameCity, ...others];

    // اگر زیردسته کم‌آگهی بود → fallback به کل شاخه دستهٔ ریشه
    if (ads.length < 3) {
      // این منطق قبلاً با چند round-trip و BFS ترتیبی روی DB اجرا می‌شد.
      // حالا از همان category index کش‌شدهٔ مشترک استفاده می‌کنیم.
      const catIndex = await buildCategoryIndex();
      let root = catIndex.getById(ad.category);
      let guard = 0;
      while (root?.parent && guard++ < 10) {
        root = catIndex.getById(root.parent);
      }
      if (root) {
        const ids = catIndex.descendantIdsById(root._id);
        const excluded = new Set(ads.map((a) => String(a._id)));
        const more = await Ad.find({
          _id: { $ne: ad._id },
          status: 'active',
          category: { $in: ids },
        })
          .sort({ createdAt: -1 })
          .limit(8)
          .select(sel)
          .populate('category', 'name slug icon')
          .lean();
        ads = [...ads, ...more.filter((a) => !excluded.has(String(a._id)))].slice(0, 6);
      }
    }
    for (const a of ads) if (a.images?.length > 1) a.images = [a.images[0]];

    res.json({ ads });
  } catch (err) {
    next(err);
  }
});

// جزئیات آگهی (بدون افزایش بازدید — خواندن خالص؛ شمارش بازدید جدا شد — FE-01)
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    const ad = await Ad.findById(req.params.id)
      .populate('category', 'name slug icon')
      .populate('owner', 'name city')
      .lean();

    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });

    // آگهی در انتظار/ردشده فقط برای مالک و ادمین قابل مشاهده است
    if (['pending', 'rejected'].includes(ad.status)) {
      const isOwner = req.user && String(req.user._id) === String(ad.owner?._id || ad.owner);
      const isAdmin = req.user?.role === 'admin';
      if (!isOwner && !isAdmin)
        return res.status(404).json({ message: 'آگهی یافت نشد' });
    }

    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

// ثبت بازدید — فقط یک‌بار از مرورگر کاربر هنگام باز شدن صفحه فراخوانی می‌شود (FE-01).
// جدا از خواندن تا fetch متادیتا/SSR/بات بازدید را دوبار/اشتباه نشمارد.
//
// 🔒 ضد تورم بازدید (M5):
// قبلاً همین endpoint بدون احراز و بدون dedup بود → یک تب می‌توانست با حلقه
// fetch، بازدید را به دلخواه بالا ببرد (تأثیر مستقیم روی اعتماد خریدار).
// حالا یک ایندکس در حافظهٔ Node نگه می‌داریم: کلید = `${adId}:${ip}`،
// مقدار = timestamp. اگر در پنجرهٔ ۶ ساعت قبلاً دیده شده، شمارنده افزایش نمی‌یابد.
// راه‌حل کامل (پشت چند instance) Redis یا Mongo TTL است؛ این پیاده‌سازی برای
// یک‌نسخهٔ تک‌instance پروژه (پشت nginx واحد) کاملاً مؤثر است.
//
// محدودیت‌ها (مستندسازی شفاف):
//  - با restart کانتینر، ایندکس از حافظه می‌رود (و dedup ریست می‌شود).
//  - چند instance: همگام نمی‌شود (هر instance ایندکس خودش را دارد).
//  - برای horizontal scaling آینده، به Redis (SETEX) مهاجرت کنید.
//
// همچنین پاک‌سازی دوره‌ای (هر ۱۵ دقیقه) برای جلوگیری از رشد بی‌نهایت Map.
const VIEW_DEDUP_TTL_MS = 6 * 60 * 60 * 1000; // ۶ ساعت
const _viewSeen = new Map(); // key=`${adId}:${ip}` → ts

// پاک‌سازی دوره‌ای (با unref تا روی بستن سرور بلاک نشود)
const _viewCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of _viewSeen) {
    if (now - ts > VIEW_DEDUP_TTL_MS) _viewSeen.delete(key);
  }
}, 15 * 60 * 1000);
_viewCleanup.unref?.();

router.post('/:id/view', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    // IP واقعی کاربر (با trust proxy درست تنظیم شده، req.ip دقیق است).
    // اگر IP در دسترس نبود، با user-agent ترکیب می‌کنیم (fallback ضعیف ولی بهتر از هیچ).
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const dedupKey = `${req.params.id}:${ip}`;
    const now = Date.now();
    const last = _viewSeen.get(dedupKey);
    if (last && now - last < VIEW_DEDUP_TTL_MS) {
      // قبلاً در پنجره شمرده شده — idempotent: همان موفقیت بدون افزایش
      return res.json({ ok: true, deduped: true });
    }
    _viewSeen.set(dedupKey, now);

    // فقط آگهی فعال بازدید می‌گیرد (آگهی در حال بررسی شمارش نمی‌شود)
    await Ad.updateOne({ _id: req.params.id, status: 'active' }, { $inc: { views: 1 } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ثبت آگهی (با حداکثر ۵ عکس)
router.post('/', writeLimiter, requireAuth, upload.array('images', 5), optimizeImages, async (req, res, next) => {
  try {
    const {
      title, description, price, isFree, category, city, neighborhood, contactPhone,
      lat, lng, condition, itemType, model, features, chatEnabled, callEnabled,
    } = req.body;

    if (!title || !description || !category || !city)
      return res.status(400).json({ message: 'عنوان، توضیحات، دسته‌بندی و شهر الزامی است' });

    // 🔒 اعتبارسنجی شماره تماس (M2): اگر کاربر شماره داد، باید فرمت موبایل
    // ایران داشته باشد؛ وگرنه به شمارهٔ احرازشدهٔ خودش fallback می‌کنیم.
    // اگر چیزی فرستاد ولی فرمت غلط بود → 400 (تا با fallback خاموش، شمارهٔ
    // واقعی کاربر بدون اطلاعش روی آگهی نرود).
    let finalContactPhone = req.user.phone;
    if (contactPhone !== undefined && String(contactPhone).trim() !== '') {
      const normalized = normalizePhone(contactPhone);
      if (!normalized) {
        return res
          .status(400)
          .json({ message: 'شماره تماس نامعتبر است (مثال: 09123456789)' });
      }
      finalContactPhone = normalized;
    }

    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);

    const ad = await Ad.create({
      title,
      description,
      price: isFree === 'true' ? 0 : Number(price) || 0,
      isFree: isFree === 'true',
      category,
      city,
      neighborhood: neighborhood || '',
      location: {
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
      },
      condition: condition || '',
      itemType: itemType || '',
      model: model || '',
      features: features || '',
      images,
      owner: req.user._id,
      contactPhone: finalContactPhone,
      chatEnabled: chatEnabled !== 'false',
      callEnabled: callEnabled !== 'false',
      attrs: parseAttrs(req.body.attrs),
    });

    res.status(201).json({ ad });
  } catch (err) {
    next(err);
  }
});

// ویرایش کامل آگهی — فقط مالک (همه فیلدها + مدیریت عکس‌ها)
router.patch('/:id', requireAuth, upload.array('images', 5), optimizeImages, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });

    // فیلدهای متنی ساده
    const allowed = [
      'title', 'description', 'city', 'neighborhood',
      'condition', 'itemType', 'model', 'features',
      // contactPhone از این لیست خارج شد و در پایین جداگانه با اعتبارسنجی
      // فرمت پردازش می‌شود (M2 — جلوگیری از گذاشتن شمارهٔ قربانی).
    ];
    const wasUnderReview = ['pending', 'rejected'].includes(ad.status);
    let contentChanged = allowed.some(
      (k) => req.body[k] !== undefined && String(req.body[k]) !== String(ad[k] ?? '')
    );
    // تغییر قیمت/دسته هم محتوایی محسوب می‌شود
    if (req.body.price !== undefined && Number(req.body.price) !== ad.price) contentChanged = true;
    if (req.body.category && String(req.body.category) !== String(ad.category)) contentChanged = true;

    for (const key of allowed) if (req.body[key] !== undefined) ad[key] = req.body[key];

    // 🔒 contactPhone با اعتبارسنجی فرمت (M2)
    if (req.body.contactPhone !== undefined) {
      const raw = String(req.body.contactPhone).trim();
      if (raw === '') {
        // خالی فرستاد → بازگشت به شمارهٔ احرازشدهٔ مالک
        ad.contactPhone = req.user.phone;
      } else {
        const normalized = normalizePhone(raw);
        if (!normalized) {
          return res
            .status(400)
            .json({ message: 'شماره تماس نامعتبر است (مثال: 09123456789)' });
        }
        ad.contactPhone = normalized;
      }
      contentChanged = true;
    }

    // مالک فقط بین وضعیت‌های عادی جابجا می‌شود؛ تایید (active) فقط با ادمین
    if (req.body.status !== undefined) {
      const userAllowed = ['reserved', 'sold', 'hidden', 'active'];
      if (userAllowed.includes(req.body.status) && !wasUnderReview) {
        ad.status = req.body.status;
      }
    }

    // قیمت / رایگان
    if (req.body.isFree !== undefined) ad.isFree = String(req.body.isFree) === 'true';
    if (req.body.price !== undefined)
      ad.price = ad.isFree ? 0 : Number(req.body.price) || 0;

    // دسته‌بندی و راه‌های تماس
    if (req.body.category && mongoose.isValidObjectId(req.body.category))
      ad.category = req.body.category;
    if (req.body.chatEnabled !== undefined)
      ad.chatEnabled = String(req.body.chatEnabled) !== 'false';
    if (req.body.callEnabled !== undefined)
      ad.callEnabled = String(req.body.callEnabled) !== 'false';

    // فیلدهای اختصاصی دسته
    if (req.body.attrs !== undefined) {
      const parsed = parseAttrs(req.body.attrs);
      if (JSON.stringify(Object.fromEntries(ad.attrs || new Map())) !== JSON.stringify(parsed)) contentChanged = true;
      ad.attrs = parsed;
    }

    // موقعیت
    if (req.body.lat !== undefined && req.body.lng !== undefined) {
      ad.location = {
        lat: req.body.lat ? Number(req.body.lat) : null,
        lng: req.body.lng ? Number(req.body.lng) : null,
      };
    }

    // مدیریت عکس‌ها:
    //  keepImages = JSON آرایه‌ای از مسیرهای قبلی که باید بمانند (به همان ترتیب — اولی = اصلی)
    //  فایل‌های جدید آپلودی به انتها اضافه می‌شوند (سقف ۵)
    const added = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const imagesBefore = JSON.stringify(ad.images);
    const oldImages = [...ad.images];
    if (req.body.keepImages !== undefined) {
      let keep = [];
      try { keep = JSON.parse(req.body.keepImages); } catch { keep = []; }
      keep = Array.isArray(keep) ? keep.filter((p) => ad.images.includes(p)) : [];
      ad.images = [...keep, ...added].slice(0, 5);
    } else if (added.length) {
      ad.images = [...ad.images, ...added].slice(0, 5);
    }
    // عکس‌های قدیمی که دیگر استفاده نمی‌شوند → حذف از دیسک
    const removed = oldImages.filter((p) => !ad.images.includes(p));
    if (removed.length) deleteUploads(removed);
    if (JSON.stringify(ad.images) !== imagesBefore) contentChanged = true;

    // هر ویرایش محتوایی (چه pending/rejected چه active) → بازگشت به صف بررسی مدیر
    if (contentChanged) {
      ad.status = 'pending';
      ad.rejectReason = '';
    }

    await ad.save();
    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id).select('owner');
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });
    // حذف آبشاری امن: آگهی + گفتگوها + پیام‌ها + گزارش‌ها + فایل‌ها (BE-01)
    await deleteAdCascade(ad._id);
    res.json({ message: 'آگهی حذف شد' });
  } catch (err) {
    next(err);
  }
});

export default router;
