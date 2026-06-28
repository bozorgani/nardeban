/**
 * کامپوننت مشترک نمایش خطای محلی (UX-01)
 * در error.js هر مسیر استفاده می‌شود تا خطای آن بخش به‌صورت محلی و با دکمهٔ
 * «تلاش مجدد» نمایش داده شود (به‌جای ریست کل اپ توسط global-error).
 */
import Link from 'next/link';

export default function ErrorState({
  reset,
  title = 'خطایی رخ داد',
  message = 'مشکلی در نمایش این بخش پیش آمد. لطفاً دوباره تلاش کنید.',
  showHome = true,
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-light text-4xl">
          ⚠️
        </div>
        <h1 className="mt-6 text-xl font-extrabold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-gray-400">{message}</p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {reset && (
            <button
              onClick={() => reset()}
              className="rounded-2xl bg-brand px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
            >
              🔄 تلاش مجدد
            </button>
          )}
          {showHome && (
            <Link
              href="/"
              className="rounded-2xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-bold text-gray-600 transition hover:border-gray-300"
            >
              🏠 بازگشت به خانه
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
