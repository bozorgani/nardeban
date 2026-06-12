# 🪜 نردبان — کلون دیوار

وب‌اپلیکیشن نیازمندی‌ها (شبیه دیوار) با **Next.js 16 (App Router) + Express.js + MongoDB**

## ساختار پروژه

```
divar-clone/
├── server/          # بک‌اند Express + Mongoose
│   ├── src/
│   │   ├── index.js           # نقطه ورود
│   │   ├── config/db.js       # اتصال مونگو
│   │   ├── config/seed.js     # داده اولیه (دسته‌بندی + آگهی نمونه)
│   │   ├── models/            # User, Ad, Category
│   │   ├── routes/            # auth, ads, categories, users
│   │   └── middleware/        # JWT auth, Multer upload
│   └── uploads/               # عکس‌های آپلودشده
└── client/          # فرانت Next.js 16 App Router + Tailwind v4
    ├── app/
    │   ├── page.js            # صفحه اصلی (لیست + فیلتر + جستجو + صفحه‌بندی)
    │   ├── ads/[id]/          # جزئیات آگهی (گالری، تماس، نشان)
    │   ├── new/               # ثبت آگهی با آپلود عکس
    │   ├── auth/              # ورود با OTP
    │   ├── my-ads/            # مدیریت آگهی‌های من
    │   └── favorites/         # نشان‌شده‌ها
    ├── components/            # Header, AdCard, Sidebar, ...
    └── lib/                   # api helper + AuthContext
```

## راه‌اندازی

### پیش‌نیاز
- Node.js 20+
- MongoDB (لوکال یا Atlas)

### ۱) بک‌اند
```bash
cd server
cp .env.example .env        # مقادیر را تنظیم کنید (مخصوصاً JWT_SECRET)
npm install
npm run seed                # دسته‌بندی‌ها و آگهی‌های نمونه
npm run dev                 # http://localhost:4000
```

### ۲) فرانت‌اند
```bash
cd client
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## ورود (حالت دمو)
سیستم ورود با OTP است. چون SMS واقعی متصل نیست، کد تایید در پاسخ API
برگردانده شده و در صفحه ورود نمایش داده می‌شود.
برای اتصال SMS واقعی (کاوه‌نگار و...) کافیست در
`server/src/routes/auth.routes.js` بخش `request-otp` را ویرایش کنید و
`demoCode` را از پاسخ حذف کنید.

## API ها

| Method | Route | توضیح |
|---|---|---|
| POST | `/api/auth/request-otp` | درخواست کد تایید |
| POST | `/api/auth/verify-otp` | تایید کد → JWT |
| GET | `/api/auth/me` | کاربر جاری |
| GET | `/api/ads` | لیست + فیلتر (`q, category, city, minPrice, maxPrice, sort, page`) |
| GET | `/api/ads/:id` | جزئیات (+ شمارش بازدید) |
| GET | `/api/ads/mine` 🔒 | آگهی‌های من |
| POST | `/api/ads` 🔒 | ثبت آگهی (multipart، تا ۵ عکس) |
| PATCH | `/api/ads/:id` 🔒 | ویرایش/تغییر وضعیت |
| DELETE | `/api/ads/:id` 🔒 | حذف |
| GET | `/api/categories` | دسته‌بندی‌ها |
| GET/POST | `/api/users/favorites[/:adId]` 🔒 | نشان‌شده‌ها |

## چت Real-time (Socket.io) ⚡
چت خریدار–فروشنده کاملاً لحظه‌ای است:
- رویدادها: `msg:new`، `msg:notify`، `typing`، `msgs:read`، `presence`
- احراز هویت سوکت با همان JWT (handshake auth)
- نشانگر «در حال نوشتن...»، وضعیت آنلاین/آفلاین، تیک ✓/✓✓ زنده
- اگر سوکت قطع شود، کلاینت خودکار به polling برمی‌گردد (fallback)
- تست: `cd client && node test-socket.mjs` (سرور باید روشن باشد)

## ایده‌های توسعه بعدی
- پنل ادمین و تایید آگهی‌ها
- آپلود روی S3/Liara به جای دیسک
- نقشه (نشان دادن محله روی Leaflet)
- Rate-limit و captcha روی OTP
