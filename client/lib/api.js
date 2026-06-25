/**
 * آدرس بک‌اند (API):
 *
 * فرانت روی Vercel و بک‌اند روی Render اجرا می‌شوند، پس API روی یک دامنه‌ی
 * جدا است. این آدرس از متغیر NEXT_PUBLIC_API_URL خوانده می‌شود.
 *
 *  - پروداکشن (Vercel): در تنظیمات Vercel → NEXT_PUBLIC_API_URL = https://nardeban.onrender.com
 *  - توسعه‌ی محلی:       در client/.env.local → NEXT_PUBLIC_API_URL = http://localhost:4000
 *
 * هوشمند: در توسعه، اگر سایت با IP شبکه باز شده ولی env به localhost اشاره دارد،
 * خودکار hostname را جایگزین می‌کند (دسترسی از گوشی روی وای‌فای).
 */
function resolveApiUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  if (typeof window === 'undefined') return envUrl;

  const pageHost = window.location.hostname;
  try {
    const env = new URL(envUrl);
    // اگر env به localhost اشاره دارد ولی صفحه از host دیگری باز شده → جایگزینی hostname
    if (
      (env.hostname === 'localhost' || env.hostname === '127.0.0.1') &&
      pageHost !== 'localhost' &&
      pageHost !== '127.0.0.1'
    ) {
      return `${window.location.protocol}//${pageHost}:${env.port || 4000}`;
    }
  } catch {
    /* ignore */
  }
  return envUrl;
}

export const API_URL = resolveApiUrl();

// توکن دیگر در localStorage نگهداری نمی‌شود (SEC-04) — احراز هویت با کوکی HttpOnly
// است که مرورگر خودکار با credentials:'include' ارسال می‌کند. این تابع برای
// سازگاری باقی مانده ولی همیشه null برمی‌گرداند (دیگر جایی توکن سمت JS نیست).
export function getToken() {
  return null;
}

export async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    credentials: 'include', // ارسال کوکی HttpOnly توکن (SEC-04)
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
