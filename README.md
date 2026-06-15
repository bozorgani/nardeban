# 🪜 نردبان — کلون دیوار

وب‌اپلیکیشن نیازمندی‌ها (شبیه دیوار) با **Next.js 16 (App Router) + Express.js + MongoDB**

## ساختار پروژه

```
nardeban/
├── server/          # بک‌اند مستقل → deploy روی Render / Railway
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
└── client/          # فرانت مستقل → deploy روی Vercel
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

سیستم ورود با OTP است. کد تایید در پاسخ API برگردانده می‌شود (SMS واقعی وصل نیست).

| نقش | شماره | کاربرد |
|---|---|---|
| کاربر عادی | `09120000000` | ثبت آگهی، چت |
| ادمین 👑 | `09110000000` | پنل مدیریت |

## 🚀 Deploy

### بک‌اند → Render

1. در [render.com](https://render.com) یک **Web Service** جدید بسازید
2. به این repo متصل کنید، **Root Directory = `server`**
3. تنظیمات:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     ```
     MONGO_URI=mongodb+srv://...   ← از MongoDB Atlas
     JWT_SECRET=your-secret
     CLIENT_ORIGIN=https://your-app.vercel.app  ← بعد از deploy فرانت
     ```
4. Render خودش `PORT` را تنظیم می‌کند.

### فرانت → Vercel

1. در [vercel.com](https://vercel.com) یک پروژه‌ی جدید بسازید
2. به این repo متصل کنید، **Root Directory = `client`**
3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-app.onrender.com  ← آدرس Render
   ```
4. Deploy — تمام!

> **نکته:** آدرس Render را در `CLIENT_ORIGIN` سرور و آدرس فرانت را در `NEXT_PUBLIC_API_URL` کلاینت بگذارید (CORS).

## تکنولوژی‌ها

- **فرانت:** Next.js 16, React 19, Tailwind v4, Leaflet, Socket.io-client
- **بک‌اند:** Express, Mongoose, Socket.io, JWT, Multer, Sharp, Web Push
- **دیتابیس:** MongoDB (Atlas در پروداکشن)
