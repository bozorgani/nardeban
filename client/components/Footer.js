import Link from 'next/link';

/**
 * فوتر سراسری بفروش (F1)
 * ----------------------------------------------------------------------------
 * چرا این کامپوننت اضافه شد:
 *   - BottomNav فقط روی موبایل (md:hidden) رندر می‌شود؛
 *     روی دسکتاپ صفحات کوتاه (/about, /terms, 404, /support) نصفه‌نیمه رها
 *     می‌شدند و هیچ ارجاع سراسری به دسته‌ها/قوانین/پشتیبانی وجود نداشت.
 *   - این فوتر **با ترکیب layout.js به‌صورت sticky footer (CSS flexbox)**
 *     همیشه به انتهای ویوپورت می‌چسبد (نه position:sticky که با overflow بشکند،
 *     بلکه min-h-dvh + flex-col روی body → main flex-1 → footer در ته).
 *
 * نمایش:
 *   - موبایل (< md): مخفی، چون BottomNav جایش را گرفته (md:block).
 *   - دسکتاپ (≥ md): همیشه آخر صفحه؛ روی صفحات کوتاه پایین چسبیده،
 *     روی صفحات بلند بعد از محتوا نمایش داده می‌شود.
 *
 * Server component (بدون 'use client'): پایداری SSR و SEO؛ همهٔ لینک‌ها واقعی،
 * توسط بات‌ها پیمایش می‌شوند.
 */
export default function Footer() {
  const year = new Date().toLocaleDateString('fa-IR', { year: 'numeric' });

  return (
    <footer
      className="mt-12 hidden border-t border-gray-200 bg-gray-50 text-sm text-gray-600 md:block"
      role="contentinfo"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        {/* برند */}
        <div>
          <Link
            href="/"
            aria-label="بفروش — صفحهٔ اصلی"
            className="flex items-center gap-1.5 text-lg font-black text-brand"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />
            </svg>
            بفروش
          </Link>
          <p className="mt-3 text-xs leading-6 text-gray-500">
            نیازمندی‌های رایگان سراسر ایران — خرید، فروش، استخدام، املاک و خودرو.
          </p>
        </div>

        {/* ناوبری اصلی */}
        <div>
          <h3 className="mb-3 text-xs font-extrabold text-gray-700">دسترسی سریع</h3>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="transition hover:text-brand">همهٔ آگهی‌ها</Link></li>
            <li><Link href="/categories" className="transition hover:text-brand">دسته‌بندی‌ها</Link></li>
            <li><Link href="/new" className="transition hover:text-brand">ثبت آگهی</Link></li>
            <li><Link href="/saved-searches" className="transition hover:text-brand">جستجوهای ذخیره‌شده</Link></li>
          </ul>
        </div>

        {/* حساب */}
        <div>
          <h3 className="mb-3 text-xs font-extrabold text-gray-700">حساب کاربری</h3>
          <ul className="space-y-2 text-xs">
            <li><Link href="/me" className="transition hover:text-brand">حساب من</Link></li>
            <li><Link href="/my-ads" className="transition hover:text-brand">آگهی‌های من</Link></li>
            <li><Link href="/favorites" className="transition hover:text-brand">نشان‌شده‌ها</Link></li>
            <li><Link href="/chat" className="transition hover:text-brand">چت و تماس</Link></li>
          </ul>
        </div>

        {/* پشتیبانی و قوانین */}
        <div>
          <h3 className="mb-3 text-xs font-extrabold text-gray-700">پشتیبانی</h3>
          <ul className="space-y-2 text-xs">
            <li><Link href="/about" className="transition hover:text-brand">دربارهٔ بفروش</Link></li>
            <li><Link href="/support" className="transition hover:text-brand">راهنما و تماس</Link></li>
            <li><Link href="/terms" className="transition hover:text-brand">قوانین استفاده</Link></li>
          </ul>
        </div>
      </div>

      {/* خط پایین */}
      <div className="border-t border-gray-200 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-gray-500 md:flex-row">
          <p>
            © {year} بفروش — تمامی حقوق محفوظ است.
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            ساخته‌شده در ایران
          </p>
        </div>
      </div>
    </footer>
  );
}
