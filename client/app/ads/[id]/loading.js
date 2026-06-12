// اسکلتون لودینگ صفحه جزئیات آگهی (Next.js به‌صورت خودکار هنگام SSR نشان می‌دهد)
export default function AdLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse" aria-busy="true" aria-label="در حال بارگذاری">
      {/* بردکرامب */}
      <div className="mb-5 flex items-center gap-2">
        <div className="h-3.5 w-12 rounded bg-gray-100" />
        <div className="h-3.5 w-3 rounded bg-gray-100" />
        <div className="h-3.5 w-16 rounded bg-gray-100" />
        <div className="h-3.5 w-3 rounded bg-gray-100" />
        <div className="h-3.5 w-24 rounded bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[5fr_6fr]">
        {/* ستون اطلاعات */}
        <div className="order-2 lg:order-1">
          <div className="h-8 w-4/5 rounded-lg bg-gray-200" />
          <div className="mt-3 h-4 w-1/2 rounded bg-gray-100" />
          <div className="mt-5 border-b border-gray-100 pb-5" />

          {/* دکمه‌ها */}
          <div className="mt-5 flex gap-2">
            <div className="h-12 flex-1 rounded-xl bg-gray-200" />
            <div className="h-12 w-24 rounded-xl bg-gray-100" />
            <div className="h-12 w-12 rounded-xl bg-gray-100" />
          </div>

          {/* ردیف‌های مشخصات */}
          <div className="mt-6 space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-50 py-4">
                <div className="h-4 w-20 rounded bg-gray-100" />
                <div className="h-4 w-28 rounded bg-gray-200" />
              </div>
            ))}
          </div>

          {/* توضیحات */}
          <div className="mt-6 h-5 w-24 rounded bg-gray-200" />
          <div className="mt-3 space-y-2.5">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-11/12 rounded bg-gray-100" />
            <div className="h-4 w-4/5 rounded bg-gray-100" />
            <div className="h-4 w-2/3 rounded bg-gray-100" />
          </div>
        </div>

        {/* ستون گالری */}
        <div className="order-1 lg:order-2">
          <div className="aspect-[4/3] rounded-2xl bg-gray-200" />
          <div className="mt-2.5 flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
