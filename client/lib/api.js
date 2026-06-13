/**
 * آدرس API:
 *
 * از آنجا که بک‌اند حالا «داخل» همین اپ Next.js اجرا می‌شود (custom server)،
 * API روی همان مبدأ (origin) صفحات قرار دارد:
 *  - سمت مرورگر: خالی (نسبی) → fetch به /api/... می‌رود (همان origin)
 *  - سمت سرور (SSR): آدرس مطلق localhost روی همان پورت پروسه
 *
 * اگر پروژه را جدا کردید (بک‌اند روی پورت دیگر)، متغیر NEXT_PUBLIC_API_URL
 * را در .env.local تنظیم کنید تا این مقدار بازنویسی شود.
 */
function resolveApiUrl() {
  // حالت جدا (legacy / production توزیع‌شده): اگر API_URL صریحاً داده شده از آن استفاده کن
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return explicit;

  if (typeof window === 'undefined') {
    // SSR داخل همان پروسه → API روی همین پورت
    const port = process.env.PORT || 3000;
    return `http://localhost:${port}`;
  }
  // مرورگر → همان origin (نسبی)
  return '';
}

export const API_URL = resolveApiUrl();

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nardeban_token');
}

export async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'خطایی رخ داد');
  return data;
}

export function imgUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // حالت یکپارچه: عکس‌ها روی همان origin سرو می‌شوند (/uploads/...)
  // API_URL در مرورگر خالی است (نسبی) و در SSR مطلق.
  return `${API_URL}${path}`;
}

export function formatPrice(ad) {
  if (ad.isFree) return 'رایگان';
  if (!ad.price) return 'توافقی';
  return `${Number(ad.price).toLocaleString('fa-IR')} تومان`;
}

export function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'لحظاتی پیش';
  if (diff < 3600) return `${Math.floor(diff / 60).toLocaleString('fa-IR')} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600).toLocaleString('fa-IR')} ساعت پیش`;
  if (diff < 2592000) return `${Math.floor(diff / 86400).toLocaleString('fa-IR')} روز پیش`;
  return new Date(date).toLocaleDateString('fa-IR');
}

export const CITIES = [
  'تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'قم', 'کرمانشاه', 'رشت',
];

// تبدیل اعداد فارسی/عربی به انگلیسی
export function faToEn(str = '') {
  return String(str)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

// فقط ارقام (با پشتیبانی ورودی فارسی)
export function digitsOnly(str = '') {
  return faToEn(str).replace(/[^0-9]/g, '');
}
