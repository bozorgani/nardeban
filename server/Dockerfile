# syntax=docker/dockerfile:1
# ----------------------------------------------------------------------------
# نردبان — بک‌اند (Express + Socket.io + Mongoose + sharp)
# ایمیج production-grade: نصب reproducible، کاربر non-root، HEALTHCHECK،
# مدیریت صحیح سیگنال‌ها (tini) برای graceful shutdown.
#
# نکتهٔ مهم دربارهٔ sharp:
#   پایهٔ ایمیج را از Alpine(musl) به Debian slim(glibc) تغییر دادیم.
#   sharp روی glibc به‌مراتب پایدارتر است و باینری libvips پیش‌ساخته دارد؛
#   روی Alpine اگر دانلود optional باینری وسط build قطع شود (ECONNRESET)،
#   npm بدون خطا تمام می‌شود ولی در runtime با
#   «Could not load the "sharp" module / libvips-cpp.so not found» کرش می‌کند.
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim

# tini = init سبک برای فوروارد صحیح SIGTERM/SIGINT به پروسهٔ Node
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# نصب وابستگی‌ها از روی lockfile (لایهٔ کش جدا از سورس)
COPY package*.json ./
# مقاوم‌سازی در برابر قطعی‌های گذرای شبکه (ECONNRESET هنگام build):
#  - تعداد و فاصلهٔ retry بیشتر، timeout بالاتر
#  - --include=optional تضمین می‌کند باینری بومی sharp (libvips) دانلود شود
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000 \
  && npm ci --omit=dev --include=optional --no-audit --no-fund \
  && npm cache clean --force

# ✅ تأیید بارگذاری sharp در زمان build — اگر باینری libvips خراب/ناقص باشد،
#    همین‌جا build می‌شکند (نه در runtime). جلوگیری از استقرار ایمیج معیوب.
RUN node -e "import('sharp').then(s=>s.default(Buffer.from([255,216,255,217])).metadata().catch(()=>{}).finally(()=>console.log('✅ sharp loaded OK')))"

# کپی سورس برنامه (با احترام به .dockerignore)
COPY . .

# مسیر آپلودها (روی والیوم mount می‌شود) و مالکیت برای کاربر node
RUN mkdir -p uploads && chown -R node:node /app

# اجرا با کاربر کم‌دسترسی به‌جای root
USER node

EXPOSE 4000

# بررسی سلامت روی endpoint موجود /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini به‌عنوان PID 1 → سیگنال‌ها درست به Node می‌رسند
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/index.js"]
