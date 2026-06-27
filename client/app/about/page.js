import Link from 'next/link';

export const metadata = {
  title: 'دربارهٔ بفروش | نیازمندی‌های رایگان',
  description: 'بفروش، پایگاه خرید و فروش بی‌واسطه — آشنایی با ما',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* هیرو */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="bg-gradient-to-br from-brand to-brand-dark px-8 py-12 text-center text-white">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/></svg>
          </span>
          <h1 className="mt-4 text-2xl font-black">بفروش</h1>
          <p className="mt-2 text-sm leading-7 text-white/85">
            پایگاه خرید و فروش بی‌واسطه — پلی میان خریدار و فروشنده در سراسر ایران
          </p>
        </div>

        <div className="space-y-6 p-8 text-[15px] leading-8 text-gray-700">
          <section>
            <h2 className="mb-2 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900">
              ما که هستیم؟
            </h2>
            <p>
              بفروش با هدف ساده‌ای ساخته شده: هر کسی بتواند در چند دقیقه چیزی را که لازم ندارد
              بفروشد و چیزی را که لازم دارد، بی‌واسطه و با قیمت منصفانه پیدا کند. از املاک و
              خودرو تا گوشی موبایل و وسایل خانه — همه در یک‌جا، رایگان و بدون کارمزد.
            </p>
          </section>

          <section>
            <h2 className="mb-2 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900">
              چرا بفروش؟
            </h2>
            <ul className="space-y-2">
              <li className="flex gap-2"><span>🆓</span> ثبت آگهی کاملاً رایگان و نامحدود</li>
              <li className="flex gap-2"><span>💬</span> چت امن داخل سایت — بدون نیاز به دادن شماره به غریبه‌ها</li>
              <li className="flex gap-2"><span>🛡️</span> بررسی آگهی‌ها پیش از انتشار + سیستم گزارش تخلف</li>
              <li className="flex gap-2"><span>⭐</span> امتیازدهی به فروشندگان برای خرید مطمئن‌تر</li>
              <li className="flex gap-2"><span>📱</span> وب‌اپلیکیشن (PWA) — نصب روی گوشی بدون نیاز به مارکت</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900">
              تماس با ما
            </h2>
            <p>
              پرسش یا پیشنهادی دارید؟ از صفحهٔ{' '}
              <Link href="/support" className="font-bold text-brand underline">پشتیبانی</Link>{' '}
              با ما در ارتباط باشید. قوانین استفاده را هم در{' '}
              <Link href="/terms" className="font-bold text-brand underline">قوانین بفروش</Link>{' '}
              بخوانید.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
