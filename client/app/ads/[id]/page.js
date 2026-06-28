import Link from 'next/link';
import dynamic from 'next/dynamic';
import { cache, Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import SimilarAds from './SimilarAds';

const FavoriteButton = dynamic(() => import('../../../components/FavoriteButton'));
const AdMap = dynamic(() => import('../../../components/AdMap'));
const ContactBox = dynamic(() => import('./ContactBox'));
const Gallery = dynamic(() => import('./Gallery'));
const ReportButton = dynamic(() => import('../../../components/ReportButton'));
const ShareButton = dynamic(() => import('../../../components/ShareButton'));
const ViewCounter = dynamic(() => import('./ViewCounter'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Skeleton برای SimilarAds در حین stream شدن (F3)
function SimilarSkeleton() {
  return (
    <section className="mt-10 border-t border-gray-100 pt-8" aria-hidden="true">
      <div className="mb-4 h-7 w-32 rounded bg-gray-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-40 animate-pulse rounded-lg border border-gray-100 bg-white p-4">
            <div className="flex flex-1 flex-col justify-between pl-3">
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-100" />
                <div className="h-4 w-1/2 rounded bg-gray-100" />
              </div>
              <div className="h-3 w-1/3 rounded bg-gray-100" />
            </div>
            <div className="h-32 w-32 self-center rounded-md bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

// با React cache، page و generateMetadata در همان درخواست فقط یک‌بار fetch می‌کنند (FE-01)
const getAd = cache(async (id) => {
  try {
    // توکن کاربر از کوکی → مالک/ادمین آگهی pending/rejected خود را هم می‌بیند
    const cookieStore = await cookies();
    const token = cookieStore.get('nardeban_token')?.value;
    const res = await fetch(`${API}/api/ads/${id}`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ad;
  } catch {
    return null;
  }
});

// متادیتای پویا برای SEO — عنوان و توضیحات هر آگهی به‌صورت اختصاصی
// (فقط آگهی‌های فعال؛ pending/rejected برای دیگران 404 می‌شوند)
export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const ad = await getAd(id); // همان fetch مشترک (بدون درخواست اضافه)
    if (!ad) return { title: 'آگهی یافت نشد | بفروش' };

    const priceText = ad.isFree
      ? 'رایگان'
      : ad.price
        ? `${Number(ad.price).toLocaleString('fa-IR')} تومان`
        : 'توافقی';

    const title = `${ad.title} — ${priceText} | بفروش`;
    const description = `${ad.title} در ${ad.city}${ad.neighborhood ? `، ${ad.neighborhood}` : ''} — ${priceText}. ${ad.description?.slice(0, 140) || ''}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        images: ad.images?.length ? [{ url: `${API}${ad.images[0]}` }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return { title: 'بفروش | نیازمندی‌های رایگان' };
  }
}

function Row({ label, children, last = false }) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${last ? '' : 'border-b border-gray-100'}`}>
      <span className="text-base text-gray-500">{label}</span>
      <span className="text-base font-bold text-gray-800">{children}</span>
    </div>
  );
}

export default async function AdPage({ params }) {
  const { id } = await params;
  const ad = await getAd(id);

  if (!ad) notFound(); // صفحه ۴۰۴ سفارشی + status code درست

  const priceText = ad.isFree
    ? 'رایگان'
    : ad.price
      ? `${Number(ad.price).toLocaleString('fa-IR')} تومان`
      : 'توافقی';

  const timeText = new Date(ad.createdAt).toLocaleDateString('fa-IR');
  const ownerId = ad.owner?._id || ad.owner;

  /*
    🏷 F9: JSON-LD Product/Offer برای SEO صفحهٔ آگهی
    -------------------------------------------------------------------------
    این مهم‌ترین structured data برای یک marketplace است. Google با این:
      - rich snippet (قیمت، موجودی، تصویر) در نتایج جستجو نمایش می‌دهد
      - آگهی را در Google Shopping/Merchant graph قابل کشف می‌کند
      - CTR را در شرایط واقعی ~۲۰-۳۰٪ بهبود می‌دهد (داده‌های مشابه دیوار/شیپور)

    استانداردهای رعایت‌شده:
      - schema.org Product (نه Offer به‌تنهایی) چون آگهی یک آیتم فیزیکی است
      - availability: InStock | Reserved | SoldOut | OutOfStock بر اساس status
      - priceCurrency: IRR (تومان = IRR ÷ ۱۰، ولی Google با IRR و قیمت تومانی
        کار می‌کند چون marketplace معیار IRT را قبول نمی‌کند — قیمت را همان
        مقدار تومان می‌فرستیم با IRR، چون marketplaceهای ایرانی هم همین می‌کنند)
      - اگر isFree یا بدون قیمت → Offer حذف می‌شود (Product بدون قیمت معتبر است)
  */
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const availabilityMap = {
    active: 'https://schema.org/InStock',
    reserved: 'https://schema.org/PreOrder',
    sold: 'https://schema.org/SoldOut',
    hidden: 'https://schema.org/OutOfStock',
  };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ad.title,
    description: (ad.description || '').slice(0, 5000),
    image: (ad.images || []).slice(0, 5).map((p) =>
      p.startsWith('http') ? p : `${apiOrigin}${p}`
    ),
    sku: String(ad._id),
    category: ad.category?.name || undefined,
    brand: ad.model
      ? { '@type': 'Brand', name: ad.model }
      : undefined,
    // فقط برای آگهی فعال/رزرو/فروخته Offer می‌گذاریم
    ...(ad.status !== 'pending' && ad.status !== 'rejected'
      ? {
          offers: {
            '@type': 'Offer',
            url: `${siteUrl}/ads/${ad._id}`,
            priceCurrency: 'IRR',
            // قیمت صفر/توافقی → 0 (Google می‌پذیرد) ولی availability همچنان معنا دارد
            price: ad.isFree ? 0 : Number(ad.price || 0),
            availability: availabilityMap[ad.status] || 'https://schema.org/InStock',
            itemCondition:
              ad.condition === 'نو'
                ? 'https://schema.org/NewCondition'
                : 'https://schema.org/UsedCondition',
            seller: {
              '@type': 'Person',
              name: ad.owner?.name || 'کاربر بفروش',
            },
            areaServed: ad.city,
          },
        }
      : {}),
    // datePosted روی Product غیراستاندارد است؛ از releaseDate به‌جایش
    releaseDate: ad.createdAt,
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* 🏷 JSON-LD برای Rich Snippet گوگل (F9) */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ثبت بازدید فقط برای آگهی فعال و یک‌بار در مرورگر (FE-01) */}
      {ad.status === 'active' && <ViewCounter adId={String(ad._id)} />}

      {/* بنر وضعیت بررسی (فقط مالک/ادمین این صفحه را در این وضعیت می‌بینند) */}
      {ad.status === 'pending' && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
          ⏳ این آگهی در انتظار تایید مدیر است و هنوز برای دیگران نمایش داده نمی‌شود.
        </div>
      )}
      {ad.status === 'rejected' && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-7 text-red-700">
          🚫 <b>این آگهی رد شده است.</b> دلیل: {ad.rejectReason || 'نامشخص'}
          <Link href={`/my-ads/edit/${ad._id}`} className="mr-2 font-bold underline">اصلاح آگهی</Link>
        </div>
      )}

      {/* بردکرامب */}
      <nav className="mb-5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm text-gray-400">
        <Link href="/" className="hover:text-brand">بفروش</Link>
        <span>›</span>
        <Link href={`/?city=${encodeURIComponent(ad.city)}`} className="hover:text-brand">{ad.city}</Link>
        <span>›</span>
        <Link href={`/?category=${ad.category?.slug}`} className="hover:text-brand">
          {ad.category?.name}
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[5fr_6fr]">
        {/* ===== ستون راست: اطلاعات ===== */}
        <div className="order-2 lg:order-1">
          <div className="lg:sticky lg:top-20">
            {/* عنوان بزرگ */}
            <h1 className="mb-2 text-2xl font-black leading-10 text-gray-900 lg:text-3xl lg:leading-[3rem]">
              {ad.title}
            </h1>
            <p className="mb-5 border-b border-gray-100 pb-5 text-sm text-gray-400">
              {timeText} در {ad.city}
              {ad.neighborhood ? `، ${ad.neighborhood}` : ''}
            </p>

            {/* دکمه‌های تماس و نشان */}
            <div className="mb-6 flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1">
                <ContactBox
                  adId={ad._id}
                  ownerId={ownerId}
                  phone={ad.contactPhone}
                  callEnabled={ad.callEnabled !== false}
                  chatEnabled={ad.chatEnabled !== false}
                />
              </div>
              <FavoriteButton adId={ad._id} />
            </div>

            {/* ردیف‌های اطلاعات کلیدی */}
            <div className="mb-6">
              <Row label="قیمت">
                <span className="text-lg font-extrabold">{priceText}</span>
              </Row>
              {ad.condition && <Row label="وضعیت">{ad.condition}</Row>}
              {ad.attrs &&
                Object.entries(ad.attrs).map(([k, v]) => {
                  const LABELS = {
                    brand: 'برند', year: 'سال ساخت', mileage: 'کارکرد', gearbox: 'گیربکس',
                    fuel: 'سوخت', bodyStatus: 'وضعیت بدنه', area: 'متراژ', rooms: 'تعداد اتاق',
                    buildYear: 'سال ساخت', deposit: 'ودیعه', rent: 'اجارهٔ ماهانه',
                    elevator: 'آسانسور', parking: 'پارکینگ', storage: 'حافظه', ram: 'رم (GB)',
                  };
                  const numeric = /^\d+$/.test(v);
                  return (
                    <Row key={k} label={LABELS[k] || k}>
                      {numeric ? Number(v).toLocaleString('fa-IR') : v}
                    </Row>
                  );
                })}
              {ad.itemType && <Row label="نوع کالا">{ad.itemType}</Row>}
              {ad.model && <Row label="مدل / برند">{ad.model}</Row>}
              <Row label="دسته‌بندی" last>
                <Link href={`/?category=${ad.category?.slug}`} className="text-brand">
                  {ad.category?.icon} {ad.category?.name}
                </Link>
              </Row>
            </div>

            {/* سایر ویژگی‌ها */}
            {ad.features && (
              <div className="mb-6">
                <h2 className="mb-3 w-fit border-b-2 border-brand pb-2 text-lg font-extrabold text-gray-800">
                  ویژگی‌ها و امکانات
                </h2>
                <p className="text-base leading-8 text-gray-700">{ad.features}</p>
              </div>
            )}

            {/* توضیحات */}
            <div className="mb-6">
              <h2 className="mb-3 w-fit border-b-2 border-brand pb-2 text-lg font-extrabold text-gray-800">
                توضیحات
              </h2>
              <p className="whitespace-pre-line text-base leading-9 text-gray-700">{ad.description}</p>
            </div>

            {/* نقشه */}
            {ad.location?.lat && (
              <div className="mb-6">
                <h2 className="mb-3 w-fit border-b-2 border-brand pb-2 text-lg font-extrabold text-gray-800">
                  موقعیت
                </h2>
                <AdMap lat={ad.location.lat} lng={ad.location.lng} />
              </div>
            )}

            {/* کارت فروشنده → پروفایل عمومی */}
            <Link
              href={`/users/${ownerId}`}
              className="mb-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand/40 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-lg font-black text-brand">
                {(ad.owner?.name || 'ن').charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-gray-800">
                  {ad.owner?.name || 'کاربر بفروش'}
                </span>
                <span className="block text-sm text-gray-400">
                  مشاهده پروفایل و همهٔ آگهی‌ها
                </span>
              </span>
              <span className="text-gray-300">◀</span>
            </Link>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-400 sm:text-sm">
                <span className="whitespace-nowrap">👁 {Number(ad.views || 0).toLocaleString('fa-IR')} بازدید</span>
                <span className="text-gray-300">·</span>
                <span className="whitespace-nowrap">شناسه: {ad._id.slice(-8)}</span>
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <ShareButton title={ad.title} />
                <ReportButton adId={String(ad._id)} ownerId={String(ownerId)} />
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              ⚠️ <b>هشدار:</b> قبل از معامله حتماً کالا را حضوری ببینید، از واریز بیعانه خودداری کنید
              و در محل‌های عمومی قرار بگذارید.
            </div>
          </div>
        </div>

        {/* ===== ستون چپ: گالری ===== */}
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-20">
            <Gallery images={ad.images} title={ad.title} icon={ad.category?.icon} />
          </div>
        </div>
      </div>

      {/*
        آگهی‌های مشابه — فقط برای آگهی‌های منتشرشده (F3)
        داخل Suspense تا fetch این بخش، render بقیهٔ صفحه (محتوای اصلی،
        گالری، ContactBox) را بلاک نکند → TTFB سریع‌تر، LCP سریع‌تر.
        Skeleton ساده در حین بارگذاری → CLS صفر.
      */}
      {ad.status === 'active' && (
        <Suspense fallback={<SimilarSkeleton />}>
          <SimilarAds adId={String(ad._id)} />
        </Suspense>
      )}
    </div>
  );
}
