/**
 * کامپوننت‌های اسکلتون مشترک (UX-02)
 * برای نمایش حالت بارگذاری به‌جای متن ساده «در حال بارگذاری...».
 * با animate-pulse و رنگ‌های سازگار با dark mode (bg-gray-100/200).
 */

// بلوک پایه
export function SkeletonBox({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />;
}

// اسکلتون کارت آگهی (هم‌اندازه با AdCard: ارتفاع ۴۰، عکس سمت چپ)
export function AdCardSkeleton() {
  return (
    <div className="flex h-40 overflow-hidden rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex min-w-0 flex-1 flex-col justify-between pl-3">
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="h-32 w-32 flex-shrink-0 self-center animate-pulse rounded-md bg-gray-100" />
    </div>
  );
}

// گرید اسکلتون کارت‌ها
export function AdGridSkeleton({ count = 6, className = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={className} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  );
}

// اسکلتون ردیف لیست (برای گفتگوها/جستجوهای ذخیره‌شده)
export function ListRowSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5">
          <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-xl bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// اسکلتون هدر صفحه (عنوان + زیرعنوان)
export function HeaderSkeleton() {
  return (
    <div className="mb-5 space-y-2" aria-hidden>
      <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
    </div>
  );
}
