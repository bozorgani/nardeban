import Link from 'next/link';
import { imgUrl, formatPrice, timeAgo } from '../lib/api';

export default function AdCard({ ad }) {
  const img = ad.images?.[0] ? imgUrl(ad.images[0]) : null;

  return (
    <Link
      href={`/ads/${ad._id}`}
      className="fade-up group flex h-40 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-md"
    >
      {/* متن — سمت راست */}
      <div className="flex min-w-0 flex-1 flex-col justify-between pl-3">
        <h3 className="line-clamp-2 text-base font-medium leading-7 text-gray-800">
          {ad.title}
        </h3>
        <div className="space-y-1">
          {ad.condition && <p className="text-sm text-gray-500">{ad.condition}</p>}
          <p className="text-base text-gray-700">{formatPrice(ad)}</p>
          <p className="truncate text-xs text-gray-400">
            {timeAgo(ad.createdAt)} در {ad.city}
            {ad.neighborhood ? `، ${ad.neighborhood}` : ''}
          </p>
        </div>
      </div>

      {/* عکس — سمت چپ (مثل دیوار) */}
      <div className="h-32 w-32 flex-shrink-0 self-center overflow-hidden rounded-md bg-gray-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={ad.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 text-4xl opacity-70">
            {ad.category?.icon || '📦'}
          </div>
        )}
      </div>
    </Link>
  );
}
