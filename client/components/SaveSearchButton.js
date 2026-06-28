import { parseCities, cityLabel } from '../lib/cities';
import SaveSearchClientButton from './SaveSearchClientButton';

/**
 * Wrapper سروری برای دکمهٔ «ذخیرهٔ جستجو»
 * --------------------------------------------------------------------------
 * قبلاً کل این کامپوننت client بود، در حالی که بخش بزرگی از کار آن (خواندن
 * فیلترها، ساخت attrs و label، تصمیم برای نمایش/عدم‌نمایش) کاملاً مشتق از
 * searchParams فعلی است و نیازی به state/hydration ندارد.
 *
 * حالا فقط لایهٔ action در کلاینت hydrate می‌شود.
 */
export default function SaveSearchButton({
  catName,
  q = '',
  category = '',
  city = '',
  minPrice = null,
  maxPrice = null,
  attrs = {},
}) {
  const hasFilter = q || category || city || minPrice || maxPrice || Object.keys(attrs).length;
  if (!hasFilter) return null;

  const parts = [];
  if (q) parts.push(`«${q}»`);
  if (catName) parts.push(catName);
  if (city) parts.push(cityLabel(parseCities(city)));
  const label = parts.join(' در ') || 'جستجوی من';

  return (
    <SaveSearchClientButton
      initialPayload={{
        query: q,
        category,
        city,
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        attrs,
        label,
      }}
    />
  );
}
