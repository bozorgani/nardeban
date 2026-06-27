// نقشه سایت پویا — Next.js خودکار /sitemap.xml را می‌سازد
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap() {
  const staticPages = [
    { url: SITE, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/support`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const res = await fetch(`${API}/api/seo/sitemap-data`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticPages;
    const data = await res.json();

    const adPages = (data.ads || []).map((a) => ({
      url: `${SITE}/ads/${a.id}`,
      lastModified: a.updatedAt ? new Date(a.updatedAt) : undefined,
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    const catPages = (data.categories || []).map((slug) => ({
      url: `${SITE}/?category=${slug}`,
      changeFrequency: 'hourly',
      priority: 0.6,
    }));

    return [...staticPages, ...catPages, ...adPages];
  } catch {
    return staticPages;
  }
}
