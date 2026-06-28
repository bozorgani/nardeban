import FavoriteButtonClient from './FavoriteButtonClient';

/**
 * wrapper سروری برای دکمهٔ نشان
 * --------------------------------------------------------------------------
 * این لایه فقط مقدار اولیهٔ UI را از دادهٔ سروری صفحه می‌گیرد؛ تعامل واقعی
 * (auth/router/POST) در leaf client component انجام می‌شود.
 */
export default function FavoriteButton({ adId, initialSaved = false }) {
  return <FavoriteButtonClient adId={adId} initialSaved={initialSaved} />;
}
