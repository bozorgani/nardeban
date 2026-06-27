# syntax=docker/dockerfile:1
# ----------------------------------------------------------------------------
# نردبان — بک‌اند (Express + Socket.io + Mongoose + sharp)
# ایمیج production-grade: نصب reproducible، کاربر non-root، HEALTHCHECK،
# مدیریت صحیح سیگنال‌ها (tini) برای graceful shutdown.
# ----------------------------------------------------------------------------
FROM node:20-alpine

# tini = init سبک برای فوروارد صحیح SIGTERM/SIGINT به پروسهٔ Node
# libc6-compat = موردنیاز sharp روی Alpine (libvips)
RUN apk add --no-cache tini libc6-compat

ENV NODE_ENV=production
WORKDIR /app

# نصب وابستگی‌ها از روی lockfile (لایهٔ کش جدا از سورس)
COPY package*.json ./
# مقاوم‌سازی در برابر قطعی‌های گذرای شبکه (ECONNRESET هنگام build):
#  - تعداد و فاصلهٔ retry بیشتر، timeout بالاتر
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000 \
  && npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

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
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
