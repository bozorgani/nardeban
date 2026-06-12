import AdCard from '../../../components/AdCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// آگهی‌های مشابه (Server Component — برای SEO هم در HTML است)
export default async function SimilarAds({ adId }) {
  let ads = [];
  try {
    const res = await fetch(`${API}/api/ads/${adId}/similar`, {
      next: { revalidate: 120 },
    });
    if (res.ok) ads = (await res.json()).ads || [];
  } catch {
    /* سرور پایین — بخش مشابه نمایش داده نمی‌شود */
  }

  if (!ads.length) return null;

  return (
    <section className="mt-10 border-t border-gray-100 pt-8">
      <h2 className="mb-4 w-fit border-b-2 border-brand pb-2 text-lg font-extrabold text-gray-800">
        آگهی‌های مشابه
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((ad) => (
          <AdCard key={ad._id} ad={ad} />
        ))}
      </div>
    </section>
  );
}
