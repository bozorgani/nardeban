import Link from 'next/link';
import SupportFaqAccordion from '../../components/SupportFaqAccordion';

const FAQS = [
  {
    q: 'چرا آگهی من منتشر نشده؟',
    a: 'هر آگهی پس از ثبت در صف بررسی قرار می‌گیرد و معمولاً ظرف چند ساعت تایید می‌شود. وضعیت آن را در «آگهی‌های من» ببینید؛ اگر رد شده باشد، دلیل آن نمایش داده می‌شود و پس از ویرایش، دوباره بررسی خواهد شد.',
  },
  {
    q: 'چطور آگهی‌ام را ویرایش یا حذف کنم؟',
    a: 'به «بفروش من ← آگهی‌های من» بروید. روی هر آگهی دکمهٔ «ویرایش» و «حذف» وجود دارد. توجه: ویرایش محتوایی، آگهی را دوباره به صف بررسی می‌فرستد.',
  },
  {
    q: 'چت کار نمی‌کند / پیام نمی‌رود؟',
    a: 'مطمئن شوید وارد حساب شده‌اید و در پروفایل خود نام ثبت کرده‌اید (برای چت الزامی است). اگر مشکل ادامه داشت، صفحه را رفرش کنید.',
  },
  {
    q: 'نوتیفیکیشن دریافت نمی‌کنم؟',
    a: 'از «بفروش من» سوییچ نوتیفیکیشن را روشن کنید و به مرورگر اجازهٔ Notification بدهید. نوتیفیکیشن فقط روی HTTPS (یا localhost) کار می‌کند و در iOS نیاز به نصب وب‌اپ روی صفحه اصلی دارد.',
  },
  {
    q: 'با آگهی متخلف یا کلاهبردار مواجه شدم!',
    a: 'در صفحهٔ همان آگهی روی «گزارش تخلف آگهی» بزنید و دلیل را انتخاب کنید. تیم بفروش در اسرع وقت بررسی می‌کند. اگر مبلغی پرداخت کرده‌اید، سریعاً به پلیس فتا (cyberpolice.ir) گزارش دهید.',
  },
  {
    q: 'چطور شماره تماسم را مخفی کنم؟',
    a: 'هنگام ثبت یا ویرایش آگهی، در بخش «راه‌های تماس» می‌توانید تماس تلفنی را خاموش کنید تا فقط چت فعال باشد.',
  },
  {
    q: 'آگهی‌ام را چند بار می‌توانم ثبت کنم؟',
    a: 'ثبت آگهی تکراری مجاز نیست و حذف می‌شود. برای دیده‌شدن بیشتر، عنوان دقیق، عکس باکیفیت و قیمت منصفانه مهم‌ترین عوامل هستند.',
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-light text-3xl">🎧</span>
        <h1 className="mt-3 text-2xl font-black text-gray-900">پشتیبانی بفروش</h1>
        <p className="mt-2 text-sm text-gray-400">پاسخ بیشتر سوالات اینجاست</p>
      </div>

      <SupportFaqAccordion faqs={FAQS} />

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href="mailto:support@nardeban.example"
          className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">✉️</span>
          <span>
            <span className="block text-sm font-extrabold text-gray-800">ایمیل پشتیبانی</span>
            <span className="block text-xs text-gray-400" dir="ltr">support@nardeban.example</span>
          </span>
        </a>
        <Link
          href="/terms"
          className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-xl">📜</span>
          <span>
            <span className="block text-sm font-extrabold text-gray-800">قوانین و مقررات</span>
            <span className="block text-xs text-gray-400">شرایط استفاده و معامله امن</span>
          </span>
        </Link>
      </div>

      <p className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-center text-sm leading-7 text-red-700">
        🚨 در صورت کلاهبرداری مالی، فوراً به <b>پلیس فتا</b> (<span dir="ltr">cyberpolice.ir</span>) گزارش دهید.
      </p>
    </div>
  );
}
