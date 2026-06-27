import Link from 'next/link';

// صفحه ۴۰۴ سفارشی فارسی
export const metadata = { title: 'صفحه پیدا نشد | بفروش' };

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        {/* بفروش شکسته */}
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-brand-light">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#a62626" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 3v7M8 14v7M16 3v18" />
            <path d="M8 7h8M8 17h8" />
            <path d="M8 10.5l-2.5 3M8 13.5l-2.5-3" strokeWidth="1.4" opacity="0.6" />
          </svg>
        </div>

        <p className="mt-6 text-6xl font-black text-gray-200">۴۰۴</p>
        <h1 className="mt-2 text-xl font-extrabold text-gray-900">
          این پله از بفروش وجود ندارد!
        </h1>
        <p className="mt-2 text-sm leading-7 text-gray-400">
          صفحه‌ای که دنبالش بودید پیدا نشد — شاید آگهی حذف شده یا آدرس اشتباه است.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-2xl bg-brand px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
          >
            🏠 بازگشت به آگهی‌ها
          </Link>
          <Link
            href="/categories"
            className="rounded-2xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-bold text-gray-600 transition hover:border-gray-300"
          >
            🗂️ مرور دسته‌بندی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
