# 🪜 نردبان — کلون دیوار

وب‌اپلیکیشن نیازمندی‌ها (شبیه دیوار) با **Next.js 16 (App Router) + Express.js + MongoDB**

## ساختار پروژه

```
nardeban/
├── server/          # بک‌اند (Express + Socket.io)
│   ├── src/
│   │   ├── index.js           # نقطه‌ی ورود (Express + Socket.io)
│   │   ├── app.js             # فکتوری ساخت اپ Express
│   │   ├── config/            # db, cors, seed, categories, sample-ads
│   │   ├── models/            # User, Ad, Category, Conversation, Message, ...
│   │   ├── routes/            # auth, ads, categories, users, chat, admin, ...
│   │   ├── middleware/        # JWT auth, multer upload, image optimize
│   │   └── socket.js          # چت Real-time
│   ├── uploads/               # عکس‌های آپلودشده
│   └── package.json
└── client/          # فرانت (Next.js)
    ├── app/                    # Next.js App Router
    │   ├── page.js             # صفحه اصلی
    │   ├── ads/[id]/           # جزئیات آگهی
    │   ├── new/                # ثبت آگهی
    │   ├── chat/               # چت real-time
    │   ├── admin/              # پنل مدیریت
    │   └── ...
    ├── components/
    ├── lib/                    # api helper, AuthContext, useSocket, ...
    └── package.json
```

## توسعه‌ی محلی

به دو ترمینال نیاز دارید:

### ۱) بک‌اند (پورت ۴۰۰۰)

```bash
cd server
cp .env.example .env        # JWT_SECRET را تنظیم کنید
npm install

# بدون نصب MongoDB (پیشنهادی برای توسعه):
npm run dev:memory

# یا با MongoDB لوکال:
# npm run seed   # فقط اولین بار
# npm run dev
```

### ۲) فرانت (پورت ۳۰۰۰)

```bash
cd client
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## ورود (حالت دمو)

سیستم ورود با OTP است.

- **توسعه:** اگر سرویس پیامک تنظیم نشده باشد (`SMS_PROVIDER=console`)، کد در کنسول سرور چاپ و **فقط در محیط توسعه** در پاسخ API (`demoCode`) برگردانده می‌شود.
- **پروداکشن:** کد **هرگز** در پاسخ API برنمی‌گردد؛ باید `SMS_PROVIDER=kavenegar` و `KAVENEGAR_API_KEY` تنظیم شوند (وگرنه درخواست OTP خطای ۵۰۳ می‌دهد).

| نقش | شماره | کاربرد |
|---|---|---|
| کاربر عادی | `09120000000` | ثبت آگهی، چت |
| ادمین 👑 | `09110000000` | پنل مدیریت |

## 🚀 استقرار روی سرور Ubuntu

این پروژه برای اجرا روی **سرور شخصی Ubuntu** پیکربندی شده: سرویس‌ها با Docker اجرا
می‌شوند و **nginx** (نصب‌شده مستقیم روی Ubuntu) جلوی آن‌ها می‌نشیند.

### ۱) سرویس‌ها با Docker
```bash
cp .env.example .env          # مقادیر را تنظیم کنید (رمز Mongo، دامنه/آدرس عمومی)
cp server/.env.example server/.env   # JWT_SECRET، sms.ir، COOKIE_SECURE و...
docker compose up -d --build
# backend روی 127.0.0.1:4000 و frontend روی 127.0.0.1:3000 و mongo داخلی
```

> اگر MongoDB Atlas دارید، می‌توانید سرویس `mongodb` را حذف و `MONGO_URI` را به Atlas بدهید.

### ۲) nginx (روی خود Ubuntu)
```bash
sudo apt install -y nginx
sudo cp nginx/nardeban-ratelimit.conf /etc/nginx/conf.d/
sudo cp nginx/nardeban.conf /etc/nginx/sites-available/nardeban
sudo ln -s /etc/nginx/sites-available/nardeban /etc/nginx/sites-enabled/nardeban
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
جزئیات کامل (دو حالت اجرا، SSL با certbot، تمدید خودکار) در `docs/NGINX-SSL.md`.

### ۳) متغیرهای مهم
- `server/.env`: `JWT_SECRET` (الزامی)، `CLIENT_ORIGIN=https://yourdomain.com`،
  `SMS_PROVIDER=smsir` + کلیدها، و `COOKIE_SECURE` (روی HTTP بدون SSL = `false`).
- `.env` (ریشه، برای compose): `NEXT_PUBLIC_API_URL=https://yourdomain.com` **بدون `/api`**
  (کد خودش `/api`، `/uploads`، `/socket.io` را اضافه می‌کند).

### ۴) SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com   # 443 + ریدایرکت + تمدید خودکار
```
بعد از SSL، در `server/.env` مقدار `COOKIE_SECURE=true` بگذارید.

> فایل‌های آپلودی: روی والیوم Docker `uploads_data` (پایدار). جزئیات و مسیر مهاجرت به
> S3 در `docs/UPLOADS.md`. ساخت ادمین: مقدار `role:"admin"` در دیتابیس (راهنما در همان داک‌ها).

## تکنولوژی‌ها

- **فرانت:** Next.js 16, React 19, Tailwind v4, Leaflet, Socket.io-client
- **بک‌اند:** Express, Mongoose, Socket.io, JWT, Multer, Sharp, Web Push
- **دیتابیس:** MongoDB (Atlas در پروداکشن)
