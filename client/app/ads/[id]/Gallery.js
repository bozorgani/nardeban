'use client';

import { useState } from 'react';
import Image from 'next/image';
import { imgUrl, thumbUrl } from '../../../lib/api';

export default function Gallery({ images = [], title, icon }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-200 text-7xl">
        {icon || '📦'}
      </div>
    );
  }

  const prev = () => setActive((a) => (a - 1 + images.length) % images.length);
  const next = () => setActive((a) => (a + 1) % images.length);

  return (
    <div className="space-y-2.5">
      {/* تصویر بزرگ — F2: next/image با priority برای LCP صفحهٔ جزئیات */}
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-gray-900">
        <Image
          src={imgUrl(images[active])}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          // تصویر اصلی صفحهٔ آگهی = LCP صفحه. priority باعث preload می‌شود.
          priority
        />

        {images.length > 1 && (
          <>
            {/* فلش‌ها */}
            {/* فلش‌ها: روی موبایل همیشه دیده می‌شوند (تاچ)، روی دسکتاپ با hover.
                opacity-100 پیش‌فرض + md:opacity-0 md:group-hover:opacity-100 */}
            <button
              type="button"
              onClick={next}
              aria-label="بعدی"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 opacity-100 shadow-md transition md:opacity-0 md:group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={prev}
              aria-label="قبلی"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 opacity-100 shadow-md transition md:opacity-0 md:group-hover:opacity-100"
            >
              ›
            </button>
            {/* شمارنده */}
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur">
              {(active + 1).toLocaleString('fa-IR')} / {images.length.toLocaleString('fa-IR')}
            </span>
          </>
        )}
      </div>

      {/* بندانگشتی‌ها */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === active ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={thumbUrl(img)}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
