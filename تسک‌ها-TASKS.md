# 🪜 نردبان — لیست کامل تسک‌ها (باگ‌ها، مشکلات، فیچرها)

> هر تسک شناسه دارد (مثل `SEC-01`). ترتیب پیشنهادی اجرا = از بالا به پایین (اول بلاکرها).
> ستون‌ها: **شدت** (🔴 بحرانی / 🟠 بالا / 🟡 متوسط / 🟢 کم) · **محل فایل** · **کاری که باید بکنیم**.
> یکی‌یکی انجام می‌دهیم؛ بعد از هر تسک تیک `[x]` بزنید.

---

## 🟥 بخش A — امنیت (بلاکر استقرار)

### [x] SEC-01 🔴 حذف افشای کد OTP در پاسخ API ✅ انجام شد (کامیت `a355260`, push شد)
- **محل:** `server/src/routes/auth.routes.js` → `POST /request-otp` (`res.json({ ..., demoCode: code })`) و `client/app/auth/page.js` (نمایش `demoCode`)
- **مشکل:** کد تأیید در پاسخ HTTP برگردانده می‌شود → هرکس می‌تواند به‌جای هر کاربر (از جمله ادمین `09110000000`) وارد شود. دور زدن کامل احراز هویت.
- **کار:** درگاه واقعی SMS (کاوه‌نگار/قاصدک/...) وصل شود. تا آن زمان `demoCode` فقط وقتی `process.env.NODE_ENV !== 'production'` برگردانده شود. در تولید کاملاً حذف.

### [x] SEC-02 🔴 حذف سکرت پیش‌فرض `'dev-secret'` و توقف هنگام نبود env ✅ انجام شد (کامیت `20bb182`, push شد)
- **محل:** `server/src/routes/auth.routes.js`، `server/src/middleware/auth.js`، `server/src/socket.js` (همگی `process.env.JWT_SECRET || 'dev-secret'`)
- **مشکل:** اگر `JWT_SECRET` ست نشود، اپ با کلید عمومیِ معلوم اجرا می‌شود → جعل توکن.
- **کار:** یک ماژول `config/env.js` بساز که هنگام بوت اگر `JWT_SECRET` (و بقیهٔ envهای الزامی) نبود `process.exit(1)` کند. همهٔ `|| 'dev-secret'`ها حذف شوند.

### [x] SEC-03 🔴 حذف کلید خصوصی VAPID هاردکدشده + rotate ✅ انجام شد (کامیت `49bcfdd`, push شد)
- **محل:** `server/src/push.js` (`VAPID_PRIVATE_KEY = 'ryL_...'` و `VAPID_PUBLIC_KEY = 'BE5c...'`)
- **مشکل:** کلید خصوصی در مخزن عمومی لو رفته.
- **کار:** مقادیر هاردکد حذف؛ فقط از env خوانده شود؛ اگر نبود push غیرفعال (بدون کرش). کلیدهای جدید با `npx web-push generate-vapid-keys` بساز و در env بگذار.

### [x] SEC-04 🟠 انتقال توکن از localStorage به کوکی HttpOnly/Secure ✅ انجام شد (کامیت `3379b14`, push شد)
- **محل:** `client/lib/AuthContext.js`، `client/lib/api.js` (`getToken`)، `server/src/routes/auth.routes.js`
- **مشکل:** JWT در `localStorage` + کوکی غیر-HttpOnly → هر XSS توکن ۳۰ روزه را می‌دزدد.
- **کار:** سرور توکن را به‌صورت کوکی `HttpOnly; Secure; SameSite=Lax` ست کند؛ کلاینت از خواندن آن دست بکشد؛ API با credentials کوکی کار کند.

### [x] SEC-05 🟠 فعال‌سازی CSP و سفت‌کردن helmet ✅ انجام شد (کامیت `3379b14`, push شد)
- **محل:** `server/src/app.js` (`contentSecurityPolicy: false`)
- **مشکل:** CSP غیرفعال است → دفاع لایه‌ای در برابر XSS وجود ندارد.
- **کار:** یک CSP محدود تعریف کن (self + origin بک‌اند + دامنهٔ فونت در صورت ادامهٔ CDN). با FE-08 (خودمیزبانی فونت) هماهنگ شود.

### [x] SEC-06 🟠 محدودسازی CORS در تولید ✅ انجام شد (کامیت `6e77a57`, push شد)
- **محل:** `server/src/config/cors.js`
- **مشکل:** هر `localhost`/IP خصوصی روی هر پورت و درخواست بدون Origin با `credentials:true` مجاز است.
- **کار:** در `NODE_ENV==='production'` فقط `CLIENT_ORIGIN`(های) دقیق مجاز باشند؛ منطق IP خصوصی فقط در dev.

### [x] SEC-07 🟠 محدودسازی brute-force OTP per-phone + کد ۶ رقمی ✅ انجام شد (کامیت `ff1bf82`, push شد)
- **محل:** `server/src/middleware/limiters.js` (`verifyLimiter`)، `server/src/routes/auth.routes.js`
- **مشکل:** ۱۰ تلاش/۱۰دقیقه فقط per-IP؛ کد ۵ رقمی با چرخش IP قابل brute-force.
- **کار:** شمارندهٔ تلاش ناموفق per-phone در دیتابیس + قفل موقت؛ کد ۶ رقمی با `crypto.randomInt`.

### [x] SEC-08 🟡 هش‌کردن OTP در دیتابیس ✅ انجام شد (کامیت `ff1bf82`, push شد)
- **محل:** `server/src/models/User.js` (`otpCode`)، `auth.routes.js`
- **مشکل:** کد به‌صورت plaintext ذخیره می‌شود.
- **کار:** کد را hash (مثلاً sha256) ذخیره کن و هنگام verify مقایسهٔ hash.

### [x] SEC-09 🟡 sanitize کردن `req.query` ✅ انجام شد (کامیت `117d59e`, push شد)
- **محل:** `server/src/app.js` (middleware mongoSanitize فقط body/params را پاک می‌کند)
- **مشکل:** مسیرها فیلتر را از query می‌سازند؛ query پاک‌سازی نمی‌شود.
- **کار:** `mongoSanitize.sanitize(req.query)` هم اضافه شود (در Express 4 قابل mutate است).

---

## 🟦 بخش B — DevOps / استقرار (بلاکر برای Ubuntu + Docker)

### [x] OPS-01 🔴 نوشتن Dockerfile سرور ✅ انجام شد (کامیت `178b57b`, push شد) — ارتقای Dockerfile موجود به سطح پروداکشن
- **کار:** ایمیج چندمرحله‌ای node (نسخهٔ پین‌شده)، نصب وابستگی‌های native برای `sharp`، `npm ci --omit=dev`، اجرای `node src/index.js`، کاربر non-root، `EXPOSE` پورت، `HEALTHCHECK` روی `/api/health`.

### [x] OPS-02 🔴 نوشتن Dockerfile فرانت + فعال‌کردن standalone ✅ انجام شد (کامیت `d0b39ee`, push شد)
- **کار:** `output: 'standalone'` در next.config؛ build چندمرحله‌ای؛ کپی `.next/standalone` و `.next/static` و `public`؛ اجرای `node server.js`.

### [x] OPS-03 🔴 نوشتن docker-compose.yml ✅ انجام شد (کامیت `337815d`, push شد)
- **کار:** سرویس‌های `server`، `client`، `mongo` (با والیوم)، `redis`، `nginx`. شبکهٔ داخلی؛ متغیرهای محیطی از `.env`؛ `restart: unless-stopped`؛ `depends_on`.

### [x] OPS-04 🔴 ماندگار کردن آپلودها (والیوم یا S3) ✅ انجام شد (کامیت `8175774`, push شد)
- **محل:** `server/src/middleware/upload.js`, `server/uploads/`, docker-compose
- **مشکل:** آپلودها روی دیسک کانتینر → با هر redeploy از بین می‌روند.
- **کار:** کوتاه‌مدت: والیوم Docker روی `server/uploads`. بلندمدت: مهاجرت به object storage سازگار با S3 (آروان/لیارا/MinIO).

### [x] OPS-05 🔴 پیکربندی nginx + reverse proxy + SSL ✅ انجام شد (کامیت `a26b5e3`, push شد)
- **کار:** reverse proxy برای `/api`, `/uploads`, `/socket.io` → server و بقیه → client؛ ترمینیشن TLS با Let's Encrypt (certbot)؛ هدرهای امنیتی؛ gzip؛ `client_max_body_size` هماهنگ با ۵ مگ آپلود؛ پشتیبانی WebSocket (`Upgrade`/`Connection`).

### [ ] OPS-06 🔴 اصلاح env کلاینت برای دامنهٔ تولید
- **محل:** `client/next.config.mjs` (`images.remotePatterns`)، `client/.env.local.example`
- **مشکل:** فقط `*.onrender.com`/`*.railway.app` مجازند (برای Render نوشته شده).
- **کار:** هاست واقعی بک‌اند تولید اضافه شود. (نکته: چون فعلاً `next/image` استفاده نمی‌شود — تسک FE-09 — این فقط برای آینده مهم است.)

### [ ] OPS-07 🟠 .dockerignore و .gitignore تکمیلی
- **محل:** `.dockerignore` (وجود ندارد)
- **کار:** `node_modules`, `.next`, `.git`, `*.mjs` تستی، `uploads/*` از ایمیج خارج شوند.

### [ ] OPS-08 🟠 graceful shutdown (SIGTERM/SIGINT)
- **محل:** `server/src/index.js`
- **مشکل:** هیچ هندلر خاموشی نیست → کانتینر هنگام stop اتصال‌ها را قطع می‌کند.
- **کار:** روی SIGTERM/SIGINT: بستن HTTP server، Socket.io، اتصال Mongoose، سپس exit.

### [ ] OPS-09 🟠 پین‌کردن نسخهٔ Node (`engines`)
- **محل:** `server/package.json`, `client/package.json`
- **کار:** فیلد `"engines": { "node": ">=20 <23" }` (یا هرچه base image است) اضافه شود.

### [ ] OPS-10 🟡 استراتژی بکاپ دیتابیس
- **کار:** کرون `mongodump` روزانه به استوریج خارج از سرور + تست restore. مستندسازی.

### [ ] OPS-11 🟡 CI/CD پایه
- **محل:** `.github/workflows/` (وجود ندارد)
- **کار:** workflow برای lint + `npm run build` هر دو اپ روی PR؛ (اختیاری) build و push ایمیج Docker.

### [ ] OPS-12 🟡 مانیتورینگ و ردیابی خطا
- **کار:** Sentry (یا مشابه) برای front و back؛ uptime monitor روی `/api/health`.

---

## 🟩 بخش C — باگ‌های بک‌اند (یکپارچگی داده و رفتار)

### [x] BE-01 🔴 تراکنش برای حذف آبشاری آگهی ✅ انجام شد (کامیت `473fe6e`, push شد)
- **محل:** `server/src/routes/admin.routes.js` → `deleteAdCompletely()`
- **مشکل:** حذف Ad/Conversation/Message/فایل‌ها در مراحل جدا بدون تراکنش → کرش میانه = دادهٔ یتیم + فایل سرگردان.
- **کار:** در یک `session`/`transaction` Mongo (نیازمند replica set / Atlas) قرار بده؛ حذف فایل‌ها بعد از commit موفق.

### [x] BE-02 🟠 رفع race شرط شمارندهٔ unread (آپدیت اتمیک) ✅ انجام شد (کامیت `707d608`, push شد)
- **محل:** `server/src/routes/chat.routes.js` (`createMessage`)، `server/src/socket.js` (`msg:send`, `msgs:read`)
- **مشکل:** `conv.unreadX += 1; conv.save()` (خواندن-تغییر-نوشتن) → دو پیام همزمان همدیگر را خراب می‌کنند.
- **کار:** با `Conversation.updateOne(..., { $inc: { unreadBuyer: 1 } })` اتمیک شود؛ ریست با `$set: { unreadX: 0 }`.

### [x] BE-03 🟠 رفع race شرط favorites (آپدیت اتمیک) ✅ انجام شد (کامیت `8d67fa8`, push شد)
- **محل:** `server/src/routes/user.routes.js` → `POST /favorites/:adId`
- **مشکل:** خواندن آرایه، splice/push، save → toggle همزمان race می‌کند.
- **کار:** ابتدا چک وجود، سپس `$addToSet` یا `$pull` اتمیک؛ یا روت جداگانهٔ add/remove.

### [ ] BE-04 🟠 یکپارچه‌سازی منطق تکراری ساخت پیام
- **محل:** `server/src/routes/chat.routes.js` (`createMessage`) و `server/src/socket.js` (`msg:send`)
- **مشکل:** دو پیاده‌سازی موازی که کم‌کم واگرا شده‌اند (متن push/شمارنده).
- **کار:** یک سرویس مشترک `services/message.service.js` بساز و هر دو از آن استفاده کنند.

### [ ] BE-05 🟠 رفع N+1 در شمارندهٔ جستجوهای ذخیره‌شده
- **محل:** `server/src/routes/savedSearch.routes.js` (`GET /`, `/new-count`)
- **مشکل:** per search یک `buildFilter` (که خودش BFS دسته می‌زند) + `countDocuments` به‌صورت ترتیبی → ده‌ها کوئری per poll هدر.
- **کار:** نتایج را موازی کن (`Promise.all`)، درخت دسته را کش کن (BE-06)، و در صورت امکان نتیجه را چند ثانیه cache کن.

### [ ] BE-06 🟡 کش‌کردن درخت/نوادگان دسته‌بندی
- **محل:** `server/src/routes/ad.routes.js`، `category.routes.js`، `savedSearch.routes.js`
- **مشکل:** BFS نوادگان (یک `Category.find` per سطح) در هر درخواست لیستِ دسته‌فیلترشده؛ ساخت کامل درخت در هر `/api/categories`.
- **کار:** درخت دسته‌ها در حافظه/Redis با TTL کش شود و تابع کمکی «همهٔ نوادگان یک slug» از کش بخواند.

### [ ] BE-07 🟡 افزودن گزینه‌های اتصال Mongoose + هندلر reconnect
- **محل:** `server/src/config/db.js`
- **مشکل:** بدون `maxPoolSize`/timeout؛ بدون هندلر رویدادهای `error`/`disconnected`.
- **کار:** گزینه‌های pool و timeout اضافه؛ لاگ رویدادهای اتصال؛ retry منطقی.

### [ ] BE-08 🟡 لاگ‌گیری ساختاریافته
- **محل:** سراسر سرور (فعلاً `console.error`)
- **کار:** pino/winston با سطح لاگ + request id؛ در تولید JSON.

### [ ] BE-09 🟡 لایهٔ اعتبارسنجی (DTO)
- **محل:** همهٔ routeها
- **کار:** Zod/Joi برای بدنه/کوئری؛ middleware اعتبارسنجی مشترک؛ حذف if-های دستی پراکنده.

### [ ] BE-10 🟢 رفع باگ کوچک `requireAdmin` (پوشش خطای async)
- **محل:** `server/src/middleware/auth.js` → `requireAdmin`
- **مشکل:** `requireAuth` async است ولی بدون await داخل `requireAdmin` صدا زده می‌شود؛ فعلاً چون next چینش درست است کار می‌کند، اما شکننده است.
- **کار:** الگو را به `await requireAuth(...)` یا composition تمیز تبدیل کن.

---

## 🟪 بخش D — دیتابیس و کارایی کوئری

### [ ] DB-01 🟠 ایندکس‌محور کردن جستجوی آگهی (به‌جای regex)
- **محل:** `server/src/routes/ad.routes.js` (`GET /` با `$regex`)
- **مشکل:** جستجوی regex از ایندکس text استفاده نمی‌کند → اسکن کامل کالکشن per query.
- **کار:** برای جستجوی متن از `$text` (ایندکس موجود) یا MongoDB Atlas Search استفاده شود؛ regex فقط fallback. (تعادل با نیاز به جستجوی فارسیِ زیررشته‌ای را در نظر بگیر — شاید ایندکس text فارسی + نرمال‌سازی.)

### [ ] DB-02 🟠 بازنگری فیلترهای عددی attr (`$expr`/`$convert`)
- **محل:** `server/src/routes/ad.routes.js` (بلوک `attr_*_min/max`)
- **مشکل:** `$expr` با `$convert` per document → بدون ایندکس، اسکن کامل.
- **کار:** فیلدهای عددی attr را به‌صورت Number ذخیره کن (DB-03) و با عملگر بازهٔ معمولی + ایندکس فیلتر کن.

### [ ] DB-03 🟡 ذخیرهٔ typed مقادیر attr
- **محل:** `server/src/models/Ad.js` (`attrs: Map<String>`)
- **مشکل:** سال/کارکرد/متراژ به‌صورت رشته ذخیره می‌شوند → ایندکس/مقایسهٔ عددی ممکن نیست.
- **کار:** اسکیمای صریح برای فیلدهای عددی شناخته‌شده یا ذخیرهٔ مقادیر به‌صورت Number.

### [ ] DB-04 🟡 فریم‌ورک مهاجرت + امن‌سازی seed
- **محل:** `server/src/config/seed.js`, `seedDemo.js`, `dev-server.js`
- **مشکل:** seed با `deleteMany({})` مخرب است؛ هیچ migration واقعی نیست.
- **کار:** ابزار migration (migrate-mongo) اضافه؛ seedِ تولید را idempotent و غیرمخرب کن (فقط upsert دسته‌ها، بدون حذف آگهی).

### [ ] DB-05 🟡 ایندکس برای کوئری‌های پرتکرار دیگر
- **محل:** `models/Ad.js`, `models/Conversation.js`
- **کار:** بررسی نیاز به ایندکس روی `owner+status+createdAt` (صفحهٔ «آگهی‌های من»/پروفایل) و `Conversation` بر اساس `buyer`/`seller`.

---

## 🟨 بخش E — فرانت‌اند (باگ و کارایی)

### [ ] FE-01 🟠 رفع دوبار fetch + دوبار افزایش بازدید در صفحهٔ آگهی
- **محل:** `client/app/ads/[id]/page.js` (`getAd` در صفحه + fetch دوبارهٔ همان آگهی در `generateMetadata`)
- **مشکل:** هر رندر = ۲ کوئری دیتابیس و `views` دوبار `$inc` می‌شود.
- **کار:** افزایش `views` را از مسیر خواندن جدا کن (اندپوینت/متد جدا یا فقط یک‌بار)؛ یا با `React.cache`/dedupe یک fetch مشترک بین page و generateMetadata.

### [ ] FE-02 🟠 افزودن error boundary برای مسیرهای مهم
- **محل:** `client/app/{chat,admin,my-ads,users/[id],new}/error.js` (وجود ندارند)
- **مشکل:** فقط `global-error.js` هست → خطای زیربخش کل اپ را ریست می‌کند.
- **کار:** برای هر بخش حساس یک `error.js` محلی با دکمهٔ retry بساز.

### [ ] FE-03 🟡 خودمیزبانی فونت (حذف CDN خارجی)
- **محل:** `client/app/layout.js` (`<link>` به `cdn.jsdelivr.net`)
- **مشکل:** render-blocking، وابستگی شخص‌ثالث، در آفلاین/CSP بارگذاری نمی‌شود.
- **کار:** Vazirmatn را با `next/font/local` خودمیزبان کن؛ `<link>` حذف شود (با SEC-05 هماهنگ).

### [ ] FE-04 🟡 رفع وابستگی‌های ناقص useEffect در چت
- **محل:** `client/app/chat/page.js` (`eslint-disable react-hooks/exhaustive-deps` در دو useEffect؛ polling روی `messages` به‌عنوان dep)
- **مشکل:** polling هر بار با تغییر `messages` interval را بازسازی می‌کند؛ احتمال رفتار ظریف.
- **کار:** از `useRef` برای آخرین پیام استفاده کن تا dep حذف شود؛ بازبینی منطق join/leave.

### [ ] FE-05 🟡 رفع رقابت favorites در UI
- **محل:** `client/components/FavoriteButton.js` (`saved` از `user.favorites` + `refresh()` کامل)
- **مشکل:** هر toggle یک `refresh()` کامل پروفایل می‌زند؛ کند و مستعد ناهماهنگی با BE-03.
- **کار:** آپدیت خوش‌بینانه (optimistic) محلی + هماهنگی با خروجی روت اتمیک.

### [ ] FE-06 🟡 یکپارچه‌سازی fetch مستقیم با helper `api`
- **محل:** `client/app/new/page.js`, `client/app/chat/page.js` (جاهایی که مستقیم `fetch(`${API_URL}...`)` با هدر دستی Authorization می‌زنند)
- **مشکل:** منطق توکن/خطا تکرار شده؛ با انتقال به کوکی (SEC-04) باید یک‌جا تغییر کند.
- **کار:** helper `api` را به فرم‌دیتا/آپلود گسترش بده و همه‌جا از آن استفاده شود.

### [ ] FE-07 🟡 وضعیت loading/error یکدست در صفحات کلاینت
- **محل:** صفحات `my-ads`, `favorites`, `saved-searches`, `users/[id]` و...
- **کار:** اسکلتون/لودینگ و پیام خطای یکسان (بعضی صفحات فقط متن ساده دارند).

### [ ] FE-08 🟢 حذف اسکریپت‌های تستی موقت از کلاینت
- **محل:** `client/test-chat-image.mjs`, `client/test-socket.mjs`
- **کار:** حذف یا انتقال به پوشهٔ `scripts/`؛ از artifact استقرار خارج شوند.

### [ ] FE-09 🟢 (تصمیم) استفاده از `next/image` یا حذف کانفیگ مرده
- **محل:** کل کلاینت از `<img>` خام استفاده می‌کند؛ `next.config.mjs → images.remotePatterns` بلااستفاده است.
- **مشکل:** یا باید بهینه‌سازی تصویر Next را به‌کار گرفت، یا کانفیگ مرده را پاک کرد.
- **کار:** تصمیم بگیر: (الف) مهاجرت `<img>`ها به `next/image` برای lazy/optimize، یا (ب) حذف `remotePatterns` و افزودن `loading="lazy"` همه‌جا (اغلب هست). توصیه: الف برای کارت‌ها/گالری.

---

## 🟧 بخش F — تمیزکاری کد و وابستگی‌ها

### [ ] CL-01 🟠 رفع آسیب‌پذیری‌های وابستگی (`npm audit`)
- **محل:** `server/`, `client/`
- **مشکل:** سرور ۳ مورد high (`ws` via socket.io)؛ کلاینت ۲ high + ۲ moderate (`ws`, `postcss`).
- **کار:** `npm audit fix` (موارد `ws` بدون breaking)؛ به‌روزرسانی socket.io/next در صورت نیاز؛ تست build بعد از آپدیت.

### [ ] CL-02 🟡 حذف وابستگی بلااستفاده `bcryptjs`
- **محل:** `server/package.json`
- **کار:** حذف (هیچ‌جا import نشده — احراز فقط OTP است).

### [ ] CL-03 🟡 حذف فایل مردهٔ `seedDemo.js` و یکپارچه‌سازی seedها
- **محل:** `server/src/config/seedDemo.js` (import نشده)، `dev-server.js`، `seed.js`
- **مشکل:** سه نسخهٔ تقریباً یکسان از منطق seed.
- **کار:** یک ماژول seed مشترک؛ `dev-server.js` و `seed.js` از آن استفاده کنند؛ `seedDemo.js` حذف یا منبع واحد شود.

### [ ] CL-04 🟡 حذف thumbnailهای بلااستفاده یا استفاده از آن‌ها
- **محل:** `server/src/middleware/optimizeImages.js` (thumbnail `.thumb.webp` می‌سازد) — فرانت هیچ‌جا از thumbnail استفاده نمی‌کند.
- **مشکل:** CPU/استوریج برای thumbnailی که مصرف نمی‌شود هدر می‌رود.
- **کار:** یا در کارت‌ها/لیست‌ها thumbnail سرو شود (بهتر برای کارایی)، یا تولید thumbnail حذف شود.

### [x] CL-05 🟢 پاک‌سازی کامنت‌ها/شناسه‌های قدیمی (Render/Vercel) ✅ انجام شد (کامیت `00e0f17`)
- **محل:** `server/src/app.js` (اشاره به `server.js`/`monolith`)، `/api/health` (`monolith:true`)، `next.config.mjs` (IP هاردکد `192.168.1.17`)
- **کار:** کامنت‌ها و مقادیر مربوط به معماری قدیمی/توسعهٔ شخصی حذف یا اصلاح شوند.

### [x] CL-06 🟢 افزودن README استقرار Ubuntu/Docker ✅ انجام شد (کامیت `00e0f17`)
- **محل:** `README.md` (فعلاً فقط Render/Vercel)
- **کار:** بخش استقرار Docker روی Ubuntu (متغیرها، compose، nginx، SSL، بکاپ) اضافه شود.

---

## 🟦 بخش G — فیچرهای جاافتاده (طبق چک‌لیست شما)

### [ ] FT-01 🟠 سیستم Refresh Token
- **مشکل:** فقط یک access token ۳۰ روزه؛ نه refresh، نه rotation، نه ابطال.
- **کار:** access token کوتاه‌مدت (مثلاً ۱۵ دقیقه) + refresh token چرخشی در کوکی HttpOnly + اندپوینت `/auth/refresh` + لیست ابطال (در Redis).

### [ ] FT-02 🟠 درگاه واقعی SMS برای OTP
- **وابسته به:** SEC-01
- **کار:** آداپتر سرویس پیامک ایرانی + قالب پیام + مدیریت خطا/هزینه.

### [ ] FT-03 🟠 Redis (cache + rate-limit store + Socket.io adapter + presence)
- **مشکل:** rate-limit و presence درون‌حافظه‌ای، با چند نمونه می‌شکنند.
- **کار:** Redis اضافه کن؛ `rate-limit-redis`؛ `@socket.io/redis-adapter`؛ presence در Redis؛ کش دسته‌ها.

### [ ] FT-04 🟠 جلوگیری از اجرای چندگانهٔ savedSearchNotifier در مقیاس افقی
- **محل:** `server/src/savedSearchNotifier.js`
- **مشکل:** `setInterval` در هر نمونه اجرا می‌شود → نوتیف تکراری.
- **کار:** leader-lock با Redis یا انتقال به یک worker جدا/کرون؛ یا صف (FT-05).

### [ ] FT-05 🟡 صف پس‌زمینه برای کارهای سنگین (پردازش عکس، push، notifier)
- **محل:** `server/src/middleware/optimizeImages.js` (sharp inline در request)
- **مشکل:** پردازش عکس درون مسیر درخواست، CPU-سنگین.
- **کار:** BullMQ روی Redis؛ آپلود سریع + پردازش async؛ push و notifier هم از صف.

### [ ] FT-06 🟢 مجموعهٔ تست (واقعی)
- **مشکل:** فقط اسکریپت‌های دستی `.mjs`.
- **کار:** تست‌های یکپارچهٔ API (Jest/Vitest + supertest) برای auth, ads, chat, admin؛ smoke test فرانت.

### [ ] FT-07 🟢 صفحهٔ مدیریت اعلان‌ها/پروفایل کامل‌تر (در صورت نیاز محصول)
- **کار:** بر اساس اولویت محصول — مثلاً مدیریت دستگاه‌های push، تنظیمات اعلان per نوع.

---

## 📋 خلاصهٔ شمارش
- 🔴 بحرانی: SEC-01, SEC-02, SEC-03, OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, BE-01 → **۱۰ تسک بلاکر**
- 🟠 بالا: ۱۸ تسک
- 🟡 متوسط: ۲۰ تسک
- 🟢 کم: ۹ تسک

**ترتیب پیشنهادی شروع:** SEC-01 → SEC-02 → SEC-03 (امنیت فوری) → BE-01/02/03 (یکپارچگی داده) → OPS-01..06 (داکرایز و استقرار) → بقیه.

> بگو از کدام تسک شروع کنیم؛ همان را با هم پیاده‌سازی می‌کنیم (کد کامل + تست).
