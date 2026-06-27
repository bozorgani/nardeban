import Link from 'next/link';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://befrosh.ir';

/* ------------------------------------------------------------------
 * متادیتای کامل برای SEO (عنوان، توضیحات، کلیدواژه‌ها، canonical،
 * OpenGraph و Twitter Card) — این صفحه Server Component است تا
 * موتورهای جستجو محتوای کامل را در HTML اولیه ببینند.
 * ------------------------------------------------------------------ */
export const metadata = {
  metadataBase: new URL(SITE),
  title: 'دربارهٔ بفروش | سایت رایگان خرید و فروش و نیازمندی‌های ایران',
  description:
    'بفروش، پلتفرم رایگان ثبت آگهی و خرید و فروش بی‌واسطه در سراسر ایران — املاک، خودرو، موبایل، کالای دیجیتال، استخدام و خدمات. آشنایی با داستان، ارزش‌ها و نحوهٔ کار بفروش.',
  keywords: [
    'بفروش',
    'درباره بفروش',
    'سایت نیازمندی',
    'ثبت آگهی رایگان',
    'خرید و فروش',
    'آگهی رایگان',
    'دیوار',
    'نیازمندی‌های ایران',
    'فروش آنلاین',
    'خرید و فروش دست دوم',
  ],
  alternates: { canonical: `${SITE}/about` },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'بفروش',
    url: `${SITE}/about`,
    title: 'دربارهٔ بفروش | سایت رایگان خرید و فروش و نیازمندی‌ها',
    description:
      'بفروش، پلتفرم رایگان خرید و فروش بی‌واسطه در سراسر ایران. داستان ما، ارزش‌ها و چرایی بفروش را بخوانید.',
    images: [{ url: `${SITE}/icons/icon-512.png`, width: 512, height: 512, alt: 'بفروش' }],
  },
  twitter: {
    card: 'summary',
    title: 'دربارهٔ بفروش',
    description: 'پلتفرم رایگان خرید و فروش بی‌واسطه در سراسر ایران.',
    images: [`${SITE}/icons/icon-512.png`],
  },
  robots: { index: true, follow: true },
};

/* ---------- آمار نمایشی (در صورت اتصال به API می‌تواند پویا شود) ---------- */
const STATS = [
  { value: '۳۱', label: 'استان زیر پوشش', icon: '📍' },
  { value: '۱۲۰+', label: 'دستهٔ آگهی', icon: '🗂️' },
  { value: '۲۴/۷', label: 'در دسترس همیشگی', icon: '⏰' },
  { value: '۰', label: 'کارمزد و هزینه', icon: '🆓' },
];

/* ---------- ویژگی‌ها ---------- */
const FEATURES = [
  {
    icon: '🆓',
    title: 'ثبت آگهی کاملاً رایگان',
    desc: 'آگهی خود را بدون هیچ هزینه و کارمزدی ثبت کنید؛ بی‌محدودیت و در چند دقیقه.',
  },
  {
    icon: '💬',
    title: 'چت امن داخل سایت',
    desc: 'بدون دادن شماره به غریبه‌ها با خریدار یا فروشنده گفتگو کنید؛ حریم خصوصی شما حفظ می‌شود.',
  },
  {
    icon: '🛡️',
    title: 'بررسی پیش از انتشار',
    desc: 'هر آگهی پیش از نمایش بررسی می‌شود و سیستم گزارش تخلف، فضای سالم را تضمین می‌کند.',
  },
  {
    icon: '⭐',
    title: 'امتیاز فروشندگان',
    desc: 'با نظر و امتیاز کاربران دیگر، با خیال راحت‌تری معامله کنید.',
  },
  {
    icon: '📍',
    title: 'جستجوی مکان‌محور',
    desc: 'آگهی‌های نزدیک خود را روی نقشه ببینید و بر اساس شهر و محله فیلتر کنید.',
  },
  {
    icon: '📱',
    title: 'وب‌اپلیکیشن (PWA)',
    desc: 'بفروش را مثل یک اپ روی صفحهٔ گوشی نصب کنید؛ بدون نیاز به دانلود از مارکت.',
  },
];

/* ---------- مراحل کار ---------- */
const STEPS = [
  { n: '۱', title: 'ثبت‌نام سریع', desc: 'فقط با شمارهٔ موبایل و یک کد تأیید وارد شوید.' },
  { n: '۲', title: 'ثبت یا جستجوی آگهی', desc: 'آگهی خود را ثبت کنید یا میان هزاران آگهی بگردید.' },
  { n: '۳', title: 'گفتگو در چت امن', desc: 'با طرف مقابل داخل سایت هماهنگ شوید.' },
  { n: '۴', title: 'معاملهٔ حضوری امن', desc: 'کالا را ببینید و معاملهٔ بی‌واسطه انجام دهید.' },
];

/* ---------- سؤالات متداول (برای FAQ Rich Result) ---------- */
const FAQ = [
  {
    q: 'آیا ثبت آگهی در بفروش رایگان است؟',
    a: 'بله، ثبت آگهی در بفروش کاملاً رایگان است و هیچ کارمزدی از معامله دریافت نمی‌شود. می‌توانید بدون محدودیت آگهی ثبت کنید.',
  },
  {
    q: 'چطور در بفروش آگهی ثبت کنم؟',
    a: 'کافی است با شمارهٔ موبایل خود وارد شوید، روی «ثبت آگهی» بزنید، دسته‌بندی و مشخصات کالا را وارد کنید، عکس بگذارید و آگهی را ثبت کنید. آگهی پس از بررسی منتشر می‌شود.',
  },
  {
    q: 'آیا برای استفاده از بفروش باید اپلیکیشن نصب کنم؟',
    a: 'خیر. بفروش یک وب‌اپلیکیشن (PWA) است و در مرورگر کار می‌کند. در صورت تمایل می‌توانید با گزینهٔ «افزودن به صفحهٔ اصلی» آن را مثل یک اپ روی گوشی نصب کنید، بدون نیاز به مارکت.',
  },
  {
    q: 'آیا معامله در بفروش امن است؟',
    a: 'بفروش بستر ارتباط خریدار و فروشنده است و خودش در معامله دخالتی ندارد. برای امنیت، کالا را حضوری ببینید، از پرداخت بیعانه خودداری کنید و قرارها را در مکان‌های عمومی بگذارید. موارد مشکوک را با «گزارش تخلف» اطلاع دهید.',
  },
  {
    q: 'شماره تماس من به همه نمایش داده می‌شود؟',
    a: 'خیر. شمارهٔ شما فقط در صورتی نمایش داده می‌شود که خودتان آن را در آگهی فعال کنید. در غیر این صورت می‌توانید فقط از طریق چت امن داخل سایت در ارتباط باشید.',
  },
];

/* ---------- داده‌های ساختاریافته JSON-LD (SEO) ---------- */
function JsonLd() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'بفروش',
      alternateName: 'Befrosh',
      url: SITE,
      logo: `${SITE}/icons/icon-512.png`,
      description:
        'پلتفرم رایگان ثبت آگهی و خرید و فروش بی‌واسطه در سراسر ایران.',
      areaServed: { '@type': 'Country', name: 'Iran' },
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'بفروش',
      url: SITE,
      inLanguage: 'fa-IR',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'خانه', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'دربارهٔ بفروش', item: `${SITE}/about` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* داده ساختاریافته برای موتورهای جستجو */}
      <JsonLd />

      {/* مسیر راهنما (Breadcrumb) برای SEO و دسترس‌پذیری */}
      <nav aria-label="مسیر" className="mb-4 text-xs text-gray-400">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand">
              خانه
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-bold text-gray-600">دربارهٔ بفروش</li>
        </ol>
      </nav>

      {/* ===== هیرو ===== */}
      <header className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="bg-gradient-to-br from-brand to-brand-dark px-6 py-12 text-center text-white sm:px-10 sm:py-16">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
            {/* آیکون برچسب قیمت (برند بفروش) */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83Z" />
              <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-black sm:text-3xl">دربارهٔ بفروش</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/90 sm:text-base sm:leading-8">
            بفروش، پایگاه رایگان خرید و فروش بی‌واسطه در سراسر ایران است؛ پلی ساده و امن میان
            خریدار و فروشنده — از املاک و خودرو تا موبایل، کالای دیجیتال، استخدام و خدمات.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/new"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-brand shadow-sm transition hover:bg-white/90"
            >
              ثبت آگهی رایگان
            </Link>
            <Link
              href="/categories"
              className="rounded-2xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/20"
            >
              مشاهدهٔ دسته‌ها
            </Link>
          </div>
        </div>

        {/* ===== آمار ===== */}
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-100 border-b border-gray-100 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-3 py-6 text-center">
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1 text-xl font-black text-gray-900">{s.value}</div>
              <div className="mt-0.5 text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ===== متن اصلی ===== */}
        <div className="space-y-10 p-6 text-[15px] leading-8 text-gray-700 sm:p-10">
          {/* داستان ما */}
          <section>
            <h2 className="mb-3 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900 sm:text-xl">
              داستان بفروش
            </h2>
            <p>
              بفروش با یک باور ساده ساخته شد: خرید و فروش باید آسان، بی‌واسطه و رایگان باشد.
              همهٔ ما چیزهایی داریم که دیگر به آن‌ها نیازی نیست و کسانی هستند که دقیقاً به همان
              چیزها نیاز دارند. بفروش این دو را به هم می‌رساند — بدون واسطه، بدون کارمزد و
              بدون پیچیدگی.
            </p>
            <p className="mt-3">
              هدف ما این است که هر ایرانی، در هر شهر و روستایی، بتواند در چند دقیقه آگهی‌اش را
              ثبت کند و چیزی را که می‌خواهد با قیمتی منصفانه پیدا کند. از خانه و خودرو تا
              کوچک‌ترین وسایل خانه، همه در یک‌جا گرد آمده‌اند.
            </p>
          </section>

          {/* چرا بفروش */}
          <section>
            <h2 className="mb-4 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900 sm:text-xl">
              چرا بفروش؟
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 transition hover:border-brand/30 hover:bg-white"
                >
                  <div className="text-2xl">{f.icon}</div>
                  <h3 className="mt-2 text-base font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* چطور کار می‌کند */}
          <section>
            <h2 className="mb-4 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900 sm:text-xl">
              بفروش چطور کار می‌کند؟
            </h2>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((st) => (
                <li key={st.n} className="rounded-2xl border border-gray-100 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-base font-black text-brand">
                    {st.n}
                  </span>
                  <h3 className="mt-3 text-[15px] font-bold text-gray-900">{st.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-gray-500">{st.desc}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ارزش‌ها */}
          <section>
            <h2 className="mb-3 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900 sm:text-xl">
              ارزش‌های ما
            </h2>
            <ul className="space-y-2.5">
              {[
                'اعتماد: فضایی امن و شفاف برای همهٔ کاربران می‌سازیم.',
                'سادگی: تجربه‌ای روان و بی‌دردسر، از ثبت آگهی تا معامله.',
                'دسترسی برابر: رایگان و در دسترس همه، در سراسر ایران.',
                'احترام به حریم خصوصی: داده‌های شما فروخته یا واگذار نمی‌شود.',
              ].map((v, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand/50" />
                  {v}
                </li>
              ))}
            </ul>
          </section>

          {/* سؤالات متداول */}
          <section>
            <h2 className="mb-4 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900 sm:text-xl">
              سؤالات متداول
            </h2>
            <div className="space-y-3">
              {FAQ.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-gray-100 bg-gray-50/60 p-5 transition open:bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold text-gray-900">
                    {f.q}
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-brand transition group-open:rotate-45">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-8 text-gray-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* تماس */}
          <section>
            <h2 className="mb-3 w-fit border-b-2 border-brand pb-1 text-lg font-extrabold text-gray-900 sm:text-xl">
              ارتباط با بفروش
            </h2>
            <p>
              پرسش، انتقاد یا پیشنهادی دارید؟ از صفحهٔ{' '}
              <Link href="/support" className="font-bold text-brand underline">
                پشتیبانی
              </Link>{' '}
              با ما در ارتباط باشید. پیش از استفاده، حتماً{' '}
              <Link href="/terms" className="font-bold text-brand underline">
                قوانین و مقررات بفروش
              </Link>{' '}
              را هم مطالعه کنید.
            </p>
          </section>
        </div>
      </header>

      {/* فراخوان پایانی (CTA) */}
      <div className="mt-6 rounded-3xl border border-brand/20 bg-brand-light p-8 text-center">
        <h2 className="text-xl font-black text-gray-900">همین حالا شروع کنید</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-gray-600">
          آگهی خود را رایگان ثبت کنید یا میان هزاران آگهی در سراسر ایران بگردید.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/new"
            className="rounded-2xl bg-brand px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-dark"
          >
            ثبت آگهی رایگان
          </Link>
          <Link
            href="/"
            className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-extrabold text-gray-700 transition hover:border-brand/40"
          >
            مشاهدهٔ آگهی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
