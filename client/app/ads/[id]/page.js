import Link from 'next/link';
import FavoriteButton from '../../../components/FavoriteButton';
import AdMap from '../../../components/AdMap';
import ContactBox from './ContactBox';
import Gallery from './Gallery';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getAd(id) {
  try {
    const res = await fetch(`${API}/api/ads/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ad;
  } catch {
    return null;
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

  if (!ad) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-base">
        آگهی یافت نشد. <Link href="/" className="text-brand underline">بازگشت</Link>
      </div>
    );
  }

  const priceText = ad.isFree
    ? 'رایگان'
    : ad.price
      ? `${Number(ad.price).toLocaleString('fa-IR')} تومان`
      : 'توافقی';

  const timeText = new Date(ad.createdAt).toLocaleDateString('fa-IR');
  const ownerId = ad.owner?._id || ad.owner;

  return (
    <div className="mx-auto max-w-5xl">
      {/* بردکرامب */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand">نردبان</Link>
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
            <div className="mb-6 flex gap-2">
              <ContactBox
                adId={ad._id}
                ownerId={ownerId}
                phone={ad.contactPhone}
                callEnabled={ad.callEnabled !== false}
                chatEnabled={ad.chatEnabled !== false}
              />
              <FavoriteButton adId={ad._id} />
            </div>

            {/* ردیف‌های اطلاعات کلیدی */}
            <div className="mb-6">
              <Row label="قیمت">
                <span className="text-lg font-extrabold">{priceText}</span>
              </Row>
              {ad.condition && <Row label="وضعیت">{ad.condition}</Row>}
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
                  {ad.owner?.name || 'کاربر نردبان'}
                </span>
                <span className="block text-sm text-gray-400">
                  مشاهده پروفایل و همهٔ آگهی‌ها
                </span>
              </span>
              <span className="text-gray-300">◀</span>
            </Link>

            <p className="mb-4 text-sm text-gray-400">
              👁 {Number(ad.views || 0).toLocaleString('fa-IR')} بازدید · شناسه آگهی: {ad._id.slice(-8)}
            </p>

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
    </div>
  );
}
