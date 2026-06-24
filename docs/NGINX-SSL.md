# 🌐 nginx + SSL (OPS-05)

nginx به‌عنوان تنها نقطهٔ ورود عمومی عمل می‌کند و ترافیک را پروکسی می‌کند:

| مسیر | مقصد |
|---|---|
| `/api/*` | `backend:4000` |
| `/uploads/*` | `backend:4000` (کش ۳۰ روزه) |
| `/socket.io/*` | `backend:4000` (WebSocket) |
| بقیه | `frontend:3000` (Next.js) |

- `client_max_body_size 10m` هماهنگ با آپلود ۵ مگابایتی + سرریز فرم.
- هدرهای `X-Forwarded-*` به backend ارسال می‌شوند (سرور `trust proxy=1` دارد → IP واقعی برای rate-limit).
- gzip، مخفی‌کردن نسخهٔ nginx، و هدرهای امنیتی پایه فعال‌اند.

## اجرا (HTTP)
```bash
cp .env.example .env      # و مقادیر را تنظیم کنید
docker compose up -d --build
# سایت روی http://SERVER_IP/ در دسترس است
```

## فعال‌سازی HTTPS با Let's Encrypt

### ۱) دامنه را به IP سرور اشاره دهید (رکورد A)

### ۲) صدور گواهی (webroot — بدون توقف nginx)
سرویس‌ها باید بالا باشند (بلاک `/.well-known/acme-challenge/` در کانفیگ آماده است):
```bash
docker run --rm \
  -v nardeban_certbot_conf:/etc/letsencrypt \
  -v nardeban_certbot_www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d nardeban.example.com --email you@example.com --agree-tos --no-eff-email
```
> نام والیوم را با `docker volume ls` بررسی کنید (پیشوند نام پروژه).

### ۳) فعال‌سازی بلاک HTTPS
در `nginx/conf.d/nardeban.conf`:
- بلاک `server { listen 443 ssl http2; ... }` را uncomment کنید.
- `server_name` و مسیر گواهی را با دامنهٔ خودتان تنظیم کنید.
- در بلاک پورت ۸۰، ریدایرکت `return 301 https://$host$request_uri;` را uncomment کنید.

### ۴) ری‌لود nginx
```bash
docker compose exec nginx nginx -t      # تست کانفیگ
docker compose exec nginx nginx -s reload
```

### ۵) تمدید خودکار (cron روی هاست)
```bash
0 3 * * * docker run --rm -v nardeban_certbot_conf:/etc/letsencrypt \
  -v nardeban_certbot_www:/var/www/certbot certbot/certbot renew --quiet \
  && docker compose exec nginx nginx -s reload
```

## نکتهٔ مهم دربارهٔ NEXT_PUBLIC_API_URL
چون این مقدار در **زمان build** داخل باندل فرانت قرار می‌گیرد، بعد از فعال‌کردن دامنه/HTTPS
باید `.env` را به دامنهٔ واقعی به‌روزرسانی و فرانت را دوباره build کنید:
```
NEXT_PUBLIC_API_URL=https://nardeban.example.com
NEXT_PUBLIC_SITE_URL=https://nardeban.example.com
```
```bash
docker compose up -d --build frontend
```
و در `server/.env` نیز `CLIENT_ORIGIN=https://nardeban.example.com` (برای CORS — مرتبط با SEC-06).
