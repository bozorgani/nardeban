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

## دو حالت اجرای nginx

### حالت A — nginx داخل docker compose (همین repo، توصیه‌شده)
upstreamها از نام سرویس استفاده می‌کنند (`backend:4000` / `frontend:3000`). تغییری لازم نیست.

### حالت B — nginx مستقیم روی Ubuntu (`sudo apt install nginx`)
چون compose پورت‌ها را روی `127.0.0.1` bind کرده، در `nginx/conf.d/nardeban.conf`
دو خط `server` را عوض کنید:
```nginx
upstream nardeban_backend  { server 127.0.0.1:4000; keepalive 32; }
upstream nardeban_frontend { server 127.0.0.1:3000; keepalive 32; }
```
سپس کانفیگ را در مسیر سیستمی nginx قرار دهید (یا include کنید) و:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
> در این حالت سرویس `nginx` را از `docker-compose.yml` حذف یا متوقف کنید تا با nginx هاست تداخل پورت ۸۰/۴۴۳ نداشته باشد.

## پورت‌ها (مهم)
backend فقط روی **4000** و frontend فقط روی **3000** (هر دو روی `127.0.0.1`) bind می‌شوند.
اگر زمانی دیدید `backend` پورت `3000` گرفته، یعنی compose قدیمی اجرا شده — با نسخهٔ فعلی
این درست است:
```yaml
backend:  { ports: ["127.0.0.1:4000:4000"] }
frontend: { ports: ["127.0.0.1:3000:3000"] }
```

## نکتهٔ مهم دربارهٔ NEXT_PUBLIC_API_URL (بدون /api)
کد کلاینت خودش `/api`، `/uploads` و `/socket.io` را به انتهای `NEXT_PUBLIC_API_URL`
اضافه می‌کند. پس فقط **origin** را بدهید، نه با `/api`:
```
✅ NEXT_PUBLIC_API_URL=https://nardeban.example.com
❌ NEXT_PUBLIC_API_URL=https://nardeban.example.com/api    # باعث /api/api/... می‌شود
```
چون این مقدار در **زمان build** داخل باندل قرار می‌گیرد، بعد از تنظیم دامنه/HTTPS فرانت را
دوباره build کنید:
```
NEXT_PUBLIC_API_URL=https://nardeban.example.com
NEXT_PUBLIC_SITE_URL=https://nardeban.example.com
```
```bash
docker compose up -d --build frontend
```
و در `server/.env` نیز `CLIENT_ORIGIN=https://nardeban.example.com` (برای CORS — مرتبط با SEC-06).
