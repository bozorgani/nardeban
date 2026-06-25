# 🌐 nginx (روی Ubuntu) + SSL

nginx **مستقیم روی Ubuntu** نصب می‌شود (نه داکر) و جلوی پروژه می‌نشیند. docker compose
فقط backend (`127.0.0.1:4000`)، frontend (`127.0.0.1:3000`) و mongo را اجرا می‌کند؛
nginx میزبان ترافیک عمومی را پروکسی می‌کند.

| مسیر | مقصد |
|---|---|
| `/api/health` | backend (بدون لاگ، بدون rate-limit — برای مانیتورینگ) |
| `/api/*` | backend (با rate-limit ضد اسپم) |
| `/uploads/*` | backend (buffering خاموش برای آپلود) |
| `/socket.io/*` | backend (WebSocket) |
| `/_next/static/*` | frontend (کش immutable یک‌ساله) |
| بقیه | frontend (Next.js، timeout 120s برای SSR) |

## نصب

### ۱) نصب nginx
```bash
sudo apt update && sudo apt install -y nginx
```

### ۲) بالا آوردن سرویس‌ها (Docker)
```bash
cp .env.example .env        # و مقادیر را تنظیم کنید (رمز Mongo، دامنه‌ها)
docker compose up -d --build
# backend روی 127.0.0.1:4000 و frontend روی 127.0.0.1:3000
```

### ۳) قرار دادن کانفیگ‌های nginx
```bash
# تنظیمات سطح http (map وب‌سوکت + rate-limit zone)
sudo cp nginx/nardeban-ratelimit.conf /etc/nginx/conf.d/nardeban-ratelimit.conf

# سایت
sudo cp nginx/nardeban.conf /etc/nginx/sites-available/nardeban
sudo ln -s /etc/nginx/sites-available/nardeban /etc/nginx/sites-enabled/nardeban
sudo rm -f /etc/nginx/sites-enabled/default     # حذف سایت پیش‌فرض

sudo nginx -t && sudo systemctl reload nginx
# سایت روی http://SERVER_IP/ در دسترس است
```

> در `nginx/nardeban.conf` مقدار `server_name _;` را به دامنهٔ واقعی خود تغییر دهید.

## فعال‌سازی HTTPS (ساده‌ترین راه برای nginx میزبان)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nardeban.example.com
```
certbot خودش بلاک `443 ssl`، ریدایرکت `80→443` و **تمدید خودکار** را اضافه می‌کند.
بررسی تمدید: `sudo certbot renew --dry-run`.

## ۴ بهبود اعمال‌شده در کانفیگ
1. **health endpoint جدا** — `location = /api/health` با `access_log off` (برای Uptime Kuma و...).
2. **timeout فرانت ۱۲۰s** — برای SSR صفحات Next.js (`proxy_read_timeout`/`proxy_send_timeout`).
3. **`proxy_request_buffering off`** روی `/uploads/` — آپلود مستقیم به backend (بهتر برای multer).
4. **rate-limit ضد اسپم** — `limit_req_zone ... rate=10r/s` + `limit_req zone=api_limit burst=20 nodelay` روی `/api/`.

## ⚠️ NEXT_PUBLIC_API_URL (بدون /api)
کد کلاینت خودش `/api`، `/uploads` و `/socket.io` را اضافه می‌کند. پس فقط **origin** بدهید:
```
✅ NEXT_PUBLIC_API_URL=https://nardeban.example.com      # یا http://194.5.192.245
❌ NEXT_PUBLIC_API_URL=/api
❌ NEXT_PUBLIC_API_URL=https://nardeban.example.com/api   # باعث /api/api/... می‌شود
```
چون این مقدار در **زمان build** داخل باندل می‌رود، بعد از تغییر دامنه فرانت را دوباره build کنید:
```bash
docker compose up -d --build frontend
```
و در `server/.env`: `CLIENT_ORIGIN=https://nardeban.example.com` (برای CORS — SEC-06).

## پورت‌ها (مهم)
backend فقط روی **4000** و frontend فقط روی **3000** (هر دو روی `127.0.0.1`) bind می‌شوند —
از اینترنت مستقیم در دسترس نیستند؛ فقط nginx میزبان به آن‌ها وصل می‌شود.
