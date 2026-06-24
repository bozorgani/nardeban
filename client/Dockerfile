# syntax=docker/dockerfile:1
# ----------------------------------------------------------------------------
# نردبان — فرانت (Next.js 16، App Router) — خروجی standalone
# build چندمرحله‌ای: مرحلهٔ deps → build → runner سبک (فقط خروجی standalone)
# ----------------------------------------------------------------------------

# ---------- مرحلهٔ ۱: نصب وابستگی‌ها ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---------- مرحلهٔ ۲: build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* در زمان build داخل باندل قرار می‌گیرند → باید اینجا موجود باشند.
# مقدار واقعی را هنگام build با --build-arg بدهید (compose: build.args).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- مرحلهٔ ۳: runner (ایمیج نهایی سبک) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache tini

# کاربر کم‌دسترسی
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# فقط خروجی لازم از standalone کپی می‌شود (نه کل node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# health: صفحهٔ اصلی باید پاسخ ۲۰۰/۳xx بدهد
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
# standalone یک server.js تولید می‌کند
CMD ["node", "server.js"]
