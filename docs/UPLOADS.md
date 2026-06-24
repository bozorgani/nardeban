# 📦 مدیریت آپلودها و پایداری (OPS-04)

## وضعیت فعلی: ذخیره روی دیسک + والیوم پایدار

آپلودهای کاربران (عکس آگهی و عکس چت) روی **دیسک محلی سرور** ذخیره می‌شوند:

- مسیر داخل کانتینر: `/app/uploads` (متمرکز در `server/src/config/paths.js`)
- مسیر URL عمومی: `/uploads/<filename>` (سرو با Express static + کش ۳۰ روزه)
- قابل override با متغیر محیطی `UPLOAD_DIR`

### چرا والیوم لازم است؟
بدون والیوم، فایل‌سیستم کانتینر **زودگذر** است؛ یعنی با هر `docker compose up --build`،
`restart` یا redeploy، **همهٔ عکس‌های آپلودشده پاک می‌شوند**. برای جلوگیری، در
`docker-compose.yml` یک والیوم نام‌دار تعریف شده:

```yaml
backend:
  volumes:
    - uploads_data:/app/uploads
volumes:
  uploads_data:
```

با این کار، داده‌ها مستقل از چرخهٔ حیات کانتینر روی والیوم Docker باقی می‌مانند.

### بکاپ والیوم آپلودها
```bash
# گرفتن بکاپ
docker run --rm -v nardeban_uploads_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-backup-$(date +%F).tar.gz -C /data .

# بازگردانی
docker run --rm -v nardeban_uploads_data:/data -v "$PWD":/backup alpine \
  sh -c "cd /data && tar xzf /backup/uploads-backup-YYYY-MM-DD.tar.gz"
```
> نام دقیق والیوم را با `docker volume ls` ببینید (معمولاً `<project>_uploads_data`).

---

## مرحلهٔ بعدی (توصیه‌شده برای مقیاس): مهاجرت به Object Storage (S3)

ذخیره روی دیسک محلی دو محدودیت دارد:
1. با **چند نمونهٔ backend** (scale افقی) هر نمونه فایل‌های خودش را دارد → عکس‌ها ناهماهنگ می‌شوند.
2. بکاپ/CDN/دوام در حد والیوم تک‌سرور است.

راه‌حل: ذخیره روی **S3-compatible** (آروان، لیارا، MinIO، AWS S3).

### نقاط تغییر در کد (محصور و کوچک — به لطف متمرکز بودن مسیرها)
- `server/src/middleware/upload.js` → به‌جای `multer.diskStorage` از `multer-s3` یا آپلود stream به باکت.
- `server/src/middleware/optimizeImages.js` → خروجی sharp به‌جای دیسک، به باکت آپلود شود.
- `server/src/utils/files.js` → `deleteUploads` به‌جای `fs.unlink`، آبجکت‌ها را از باکت حذف کند.
- `server/src/app.js` → دیگر نیازی به سرو static نیست؛ URLها مستقیم به باکت/CDN اشاره می‌کنند (`imgUrl` در کلاینت سازگار است چون URL مطلق را هم می‌پذیرد).

### متغیرهای محیطی پیشنهادی برای فاز S3
```
STORAGE_DRIVER=s3            # disk | s3
S3_ENDPOINT=https://s3.example.com
S3_REGION=us-east-1
S3_BUCKET=nardeban-uploads
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.example.com   # دامنهٔ عمومی/CDN باکت
```

> این مهاجرت یک تسک جداست (می‌تواند بخشی از FT/Storage باشد). معماری فعلی طوری
> چیده شده که این تغییر فقط در همین چند فایل محصور بماند.
