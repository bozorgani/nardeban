// robots.txt — Next.js خودکار /robots.txt را می‌سازد
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/chat',
          '/me',
          '/my-ads',
          '/favorites',
          '/auth',
          '/new',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
