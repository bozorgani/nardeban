import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import FavoriteButton from '../../../components/FavoriteButton';
import AdMap from '../../../components/AdMap';
import ContactBox from './ContactBox';
import Gallery from './Gallery';
import ReportButton from '../../../components/ReportButton';
import ShareButton from '../../../components/ShareButton';
import SimilarAds from './SimilarAds';
import ViewCounter from './ViewCounter';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  return (
    <div className="mx-auto max-w-5xl">
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

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                👁 {Number(ad.views || 0).toLocaleString('fa-IR')} بازدید · شناسه آگهی: {ad._id.slice(-8)}
              </p>
              <div className="flex items-center gap-1">
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

      {/* آگهی‌های مشابه — فقط برای آگهی‌های منتشرشده */}
      {ad.status === 'active' && <SimilarAds adId={String(ad._id)} />}
    </div>
  );
}
