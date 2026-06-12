'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, timeAgo } from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import { useToast } from '../../../components/Toast';

function StarPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'];
  const active = hover || value;

  return (
    <div className="text-center">
      <div className="inline-flex flex-row-reverse gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
            aria-label={`${s} ستاره`}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill={active >= s ? '#f59e0b' : '#e5e7eb'}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-xs font-bold text-amber-600">{labels[active] || ''}</p>
    </div>
  );
}

export default function RatingSection({ sellerId }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [hadReview, setHadReview] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [reviews, setReviews] = useState([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPages, setReviewsPages] = useState(0);

  // امتیاز قبلی من + مالکیت
  useEffect(() => {
    if (!user) return;
    api(`/users/${sellerId}/profile?limit=1`)
      .then((d) => {
        setIsOwner(d.isOwner);
        if (d.myReview) {
          setMyRating(d.myReview.rating);
          setMyComment(d.myReview.comment || '');
          setHadReview(true);
        }
      })
      .catch(() => {});
  }, [user, sellerId]);

  // لیست نظرات
  const loadReviews = (page = 1) => {
    api(`/users/${sellerId}/reviews?page=${page}`)
      .then((d) => {
        setReviews((prev) => (page === 1 ? d.reviews : [...prev, ...d.reviews]));
        setReviewsTotal(d.total);
        setReviewsPages(d.pages);
        setReviewsPage(page);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const submit = async () => {
    if (!user) return router.push('/auth');
    if (!myRating) return setMsg('ابتدا ستاره بدهید');
    setBusy(true);
    setMsg('');
    try {
      await api(`/users/${sellerId}/reviews`, {
        method: 'POST',
        body: { rating: myRating, comment: myComment },
      });
      setHadReview(true);
      setMsg('✓ امتیاز شما ثبت شد');
      loadReviews(1);
      router.refresh(); // به‌روزرسانی خلاصه امتیاز SSR
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await toast.confirm({
      title: 'حذف امتیاز',
      message: 'امتیاز و نظر شما برای این فروشنده حذف می‌شود.',
      confirmText: 'حذف شود',
      danger: true,
      icon: '⭐',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api(`/users/${sellerId}/reviews`, { method: 'DELETE' });
      setMyRating(0);
      setMyComment('');
      setHadReview(false);
      setMsg('');
      loadReviews(1);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* فرم امتیازدهی */}
      {!authLoading && !isOwner && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-center text-sm font-extrabold text-gray-800">
            {hadReview ? 'امتیاز شما (قابل ویرایش)' : 'به این فروشنده امتیاز دهید'}
          </h3>

          {!user ? (
            <button
              onClick={() => router.push('/auth')}
              className="w-full rounded-xl border-2 border-brand py-2.5 text-sm font-bold text-brand transition hover:bg-brand-light"
            >
              برای امتیازدهی وارد شوید
            </button>
          ) : (
            <>
              <StarPicker value={myRating} onChange={setMyRating} disabled={busy} />
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="نظر خود را بنویسید (اختیاری)..."
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white"
              />
              {msg && (
                <p className={`mt-2 text-center text-xs font-bold ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {msg}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={submit}
                  disabled={busy || !myRating}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-40"
                >
                  {busy ? '...' : hadReview ? 'به‌روزرسانی امتیاز' : 'ثبت امتیاز'}
                </button>
                {hadReview && (
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
                  >
                    حذف
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* لیست نظرات */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-extrabold text-gray-800">
          نظرات کاربران ({Number(reviewsTotal).toLocaleString('fa-IR')})
        </h3>

        {reviews.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            هنوز نظری ثبت نشده — اولین نفر باشید! ⭐
          </p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r._id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {r.raterName.charAt(0)}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{r.raterName}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-500" dir="ltr">
                    {'★'.repeat(r.rating)}
                    <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1.5 pr-9 text-sm leading-6 text-gray-600">{r.comment}</p>
                )}
                <p className="mt-1 pr-9 text-[10px] text-gray-300">{timeAgo(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}

        {reviewsPage < reviewsPages && (
          <button
            onClick={() => loadReviews(reviewsPage + 1)}
            className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-xs text-gray-500 transition hover:border-brand hover:text-brand"
          >
            نظرات بیشتر
          </button>
        )}
      </div>
    </div>
  );
}
