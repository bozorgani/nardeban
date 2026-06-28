'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api, API_URL, digitsOnly, thumbUrl } from '../../../../lib/api';
import { useAuth } from '../../../../lib/AuthContext';
import { useToast } from '../../../../components/Toast';
import CategoryFields from '../../../../components/CategoryFields';
import Spinner from '../../../../components/Spinner';

const MapPicker = dynamic(() => import('../../../../components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border bg-gray-50 text-sm text-gray-400">
      در حال بارگذاری نقشه...
    </div>
  ),
});

const CONDITIONS = ['نو', 'در حد نو', 'کارکرده', 'نیاز به تعمیر'];

// اعتبارسنجی عکس — هم‌راستا با /new و multer بک‌اند
const MAX_FILE_SIZE = 5 * 1024 * 1024; // ۵ مگابایت
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
function humanSize(bytes) {
  if (bytes >= 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`;
  return `${Math.round(bytes / 1024).toLocaleString('fa-IR')} کیلوبایت`;
}

export default function EditAdPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();

  const [tree, setTree] = useState([]);
  const [ad, setAd] = useState(null);
  const [notMine, setNotMine] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // فرم
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [location, setLocation] = useState(null);
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [condition, setCondition] = useState('');
  const [itemType, setItemType] = useState('');
  const [attrs, setAttrs] = useState({});
  const [model, setModel] = useState('');
  const [features, setFeatures] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [callEnabled, setCallEnabled] = useState(true);

  // عکس‌ها: قبلی‌ها (مسیر سرور) + جدیدها (File)
  const [keepImages, setKeepImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
  }, [authLoading, user, router, pathname]);

  useEffect(() => {
    api('/categories').then((d) => setTree(d.tree || [])).catch(() => {});
  }, []);

  // بارگذاری آگهی
  useEffect(() => {
    if (!user) return;
    api(`/ads/${id}`)
      .then(({ ad }) => {
        const ownerId = ad.owner?._id || ad.owner;
        if (String(ownerId) !== String(user.id)) return setNotMine(true);
        setAd(ad);
        setTitle(ad.title);
        setDescription(ad.description);
        setCategory(ad.category?._id || ad.category || '');
        setCity(ad.city || '');
        setNeighborhood(ad.neighborhood || '');
        if (ad.location?.lat) setLocation({ lat: ad.location.lat, lng: ad.location.lng });
        setPrice(ad.price ? String(ad.price) : '');
        setIsFree(!!ad.isFree);
        setCondition(ad.condition || '');
        setItemType(ad.itemType || '');
        setAttrs(ad.attrs || {});
        setModel(ad.model || '');
        setFeatures(ad.features || '');
        setContactPhone(ad.contactPhone || user.phone);
        setChatEnabled(ad.chatEnabled !== false);
        setCallEnabled(ad.callEnabled !== false);
        setKeepImages(ad.images || []);
      })
      .catch(() => setNotMine(true));
  }, [user, id]);

  const totalImages = keepImages.length + newFiles.length;

  const onFiles = (e) => {
    setError('');
    const incoming = Array.from(e.target.files);

    // اعتبارسنجی نوع و حجم در لحظهٔ انتخاب (مثل /new) — جلوگیری از خطا در ذخیرهٔ نهایی
    const accepted = [];
    const errors = [];
    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`«${f.name}»: فقط JPG/PNG/WebP مجاز است`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`«${f.name}» ${humanSize(f.size)} است — حداکثر ${humanSize(MAX_FILE_SIZE)}`);
        continue;
      }
      accepted.push(f);
    }

    // سقف تعداد کل (عکس‌های نگه‌داشته‌شده + جدیدها)
    const room = MAX_FILES - totalImages;
    const toAdd = accepted.slice(0, Math.max(0, room));
    if (accepted.length > toAdd.length) {
      errors.push(`حداکثر ${MAX_FILES.toLocaleString('fa-IR')} عکس مجاز است`);
    }

    if (errors.length) {
      const msg = errors.join(' — ');
      setError(msg);
      toast?.error(msg, { title: 'عکس رد شد', duration: 6000 });
    }

    if (toAdd.length) {
      setNewFiles((prev) => [...prev, ...toAdd]);
      setNewPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    }
    e.target.value = '';
  };

  const removeOld = (i) => setKeepImages((arr) => arr.filter((_, idx) => idx !== i));
  const removeNew = (i) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewFiles((arr) => arr.filter((_, idx) => idx !== i));
    setNewPreviews((arr) => arr.filter((_, idx) => idx !== i));
  };
  // عکس اصلی = اولین عکسِ قبلی؛ کلیک = انتقال به اول
  const makeMainOld = (i) =>
    setKeepImages((arr) => [arr[i], ...arr.filter((_, idx) => idx !== i)]);

  const save = async () => {
    if (title.trim().length < 5) return setError('عنوان باید حداقل ۵ حرف باشد');
    if (description.trim().length < 10) return setError('توضیحات باید حداقل ۱۰ حرف باشد');
    if (!city.trim()) return setError('شهر را مشخص کنید');
    if (!/^09\d{9}$/.test(digitsOnly(contactPhone))) return setError('شماره تماس معتبر نیست');
    if (!chatEnabled && !callEnabled) return setError('حداقل یک راه تماس را فعال کنید');

    setError('');
    setBusy(true);

    const fd = new FormData();
    fd.set('title', title.trim());
    fd.set('description', description.trim());
    if (category) fd.set('category', category);
    fd.set('city', city.trim());
    fd.set('neighborhood', neighborhood.trim());
    if (location) { fd.set('lat', location.lat); fd.set('lng', location.lng); }
    fd.set('isFree', String(isFree));
    fd.set('price', isFree ? '0' : price || '0');
    fd.set('condition', condition);
    fd.set('itemType', itemType.trim());
    fd.set('model', model.trim());
    fd.set('features', features.trim());
    fd.set('attrs', JSON.stringify(attrs));
    fd.set('contactPhone', digitsOnly(contactPhone));
    fd.set('chatEnabled', String(chatEnabled));
    fd.set('callEnabled', String(callEnabled));
    fd.set('keepImages', JSON.stringify(keepImages));
    newFiles.forEach((f) => fd.append('images', f));

    try {
      const res = await fetch(`${API_URL}/api/ads/${id}`, {
        method: 'PATCH',
        credentials: 'include', // کوکی HttpOnly توکن (SEC-04)
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'خطا در ذخیره');
      if (data.ad?.status === 'pending') {
        toast.success('تغییرات ذخیره شد و آگهی برای بررسی مجدد ارسال شد', { title: '⏳ در انتظار تایید', duration: 6000 });
      } else {
        toast.success('تغییرات ذخیره شد');
      }
      router.push('/my-ads');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (authLoading || !user)
    return <p className="py-16 text-center text-gray-400">در حال بارگذاری...</p>;

  if (notMine)
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-12 text-center">
        <p className="mb-2 text-4xl">🚫</p>
        <p className="font-bold text-gray-700">این آگهی متعلق به شما نیست</p>
        <Link href="/my-ads" className="mt-3 inline-block text-sm text-brand underline">
          آگهی‌های من
        </Link>
      </div>
    );

  if (!ad) return <p className="py-16 text-center text-gray-400">در حال بارگذاری آگهی...</p>;

  const inputCls =
    'w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">✏️ ویرایش آگهی</h1>
          <p className="mt-0.5 truncate text-sm text-gray-400">{ad.title}</p>
        </div>
        <Link href={`/ads/${id}`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs text-gray-500 hover:border-gray-300">
          مشاهده آگهی
        </Link>
      </div>

      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">⚠️ {error}</p>}

      {ad.status === 'rejected' && ad.rejectReason && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-7 text-red-700">
          🚫 <b>دلیل رد:</b> {ad.rejectReason}
        </div>
      )}
      <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-700">
        💡 پس از ذخیرهٔ تغییرات، آگهی برای بررسی مجدد به مدیر ارسال می‌شود و تا تایید، از دید عموم خارج است.
      </div>

      <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 text-sm">
        {/* عکس‌ها */}
        <div>
          <label className="mb-2 block font-bold">عکس‌ها ({totalImages.toLocaleString('fa-IR')}/۵)</label>
          <div className="flex flex-wrap gap-3">
            {totalImages < 5 && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-brand hover:text-brand">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.2-2h3.6L15 6"/></svg>
                <span className="text-[10px]">افزودن</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFiles} />
              </label>
            )}
            {keepImages.map((src, i) => (
              <div key={src} className="relative h-24 w-24">
                <button type="button" onClick={() => makeMainOld(i)} title="عکس اصلی شود"
                  className={`block h-full w-full overflow-hidden rounded-2xl border-2 ${i === 0 ? 'border-brand ring-2 ring-brand/30' : 'border-gray-200 hover:border-gray-400'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl(src)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 right-1 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">★ اصلی</span>
                )}
                <button type="button" onClick={() => removeOld(i)}
                  className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow">✕</button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div key={src} className="relative h-24 w-24">
                <div className="h-full w-full overflow-hidden rounded-2xl border-2 border-dashed border-green-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" decoding="async" />
                </div>
                <span className="absolute bottom-1 right-1 rounded-md bg-green-500 px-1.5 py-0.5 text-[9px] text-white">جدید</span>
                <button type="button" onClick={() => removeNew(i)}
                  className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow">✕</button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">روی عکس قدیمی بزنید تا «اصلی» شود · عکس‌های جدید بعد از ذخیره اضافه می‌شوند</p>
        </div>

        <div>
          <label className="mb-1.5 block font-bold">عنوان *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block font-bold">توضیحات *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={3000} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-bold">دسته‌بندی</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {tree.map((p) =>
                p.children?.length ? (
                  <optgroup key={p._id} label={`${p.icon} ${p.name}`}>
                    {p.children.flatMap((c) =>
                      c.children?.length
                        ? [
                            <option key={c._id} value={c._id} disabled>— {c.name} —</option>,
                            ...c.children.map((g) => (
                              <option key={g._id} value={g._id}>{c.name} › {g.name}</option>
                            )),
                          ]
                        : [<option key={c._id} value={c._id}>{c.name}</option>]
                    )}
                  </optgroup>
                ) : (
                  <option key={p._id} value={p._id}>{p.icon} {p.name}</option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-bold">وضعیت کالا</label>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS.map((c) => (
                <button key={c} type="button" onClick={() => setCondition(condition === c ? '' : c)}
                  className={`rounded-full border px-3 py-2 text-xs transition ${condition === c ? 'border-brand bg-brand-light font-bold text-brand' : 'border-gray-200 text-gray-500'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CategoryFields categoryId={category} values={attrs} onChange={setAttrs} />

        <div>
          <label className="mb-1.5 block font-bold">قیمت (تومان)</label>
          <div className="flex items-center gap-3">
            <input type="text" inputMode="numeric"
              value={price ? Number(price).toLocaleString('fa-IR') : ''}
              onChange={(e) => setPrice(digitsOnly(e.target.value))}
              disabled={isFree} placeholder="خالی = توافقی"
              className={`${inputCls} flex-1 disabled:opacity-50`} />
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} /> رایگان
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-bold">شهر *</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block font-bold">محله</label>
            <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* نقشه (اختیاری، جمع‌شونده) */}
        <div>
          <button type="button" onClick={() => setShowMap((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 font-bold text-gray-700 transition hover:border-gray-300">
            📍 موقعیت روی نقشه {location ? '(ثبت شده ✓)' : '(اختیاری)'}
            <span className={`text-xs text-gray-300 transition-transform ${showMap ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showMap && (
            <div className="mt-3">
              <MapPicker value={location} onChange={setLocation} onCityDetect={(c) => setCity(c)} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-bold">نوع کالا</label>
            <input value={itemType} onChange={(e) => setItemType(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block font-bold">مدل / برند</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-bold">سایر ویژگی‌ها</label>
          <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={2} className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block font-bold">شماره تماس *</label>
          <input dir="ltr" value={contactPhone} onChange={(e) => setContactPhone(digitsOnly(e.target.value).slice(0, 11))}
            className={`${inputCls} text-center tracking-widest`} />
        </div>

        <div className="flex gap-3">
          <label className={`flex flex-1 cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${callEnabled ? 'border-brand bg-brand-light' : 'border-gray-200'}`}>
            <span className="text-xs font-bold">📞 تماس</span>
            <input type="checkbox" checked={callEnabled} onChange={(e) => setCallEnabled(e.target.checked)} className="accent-[#a62626]" />
          </label>
          <label className={`flex flex-1 cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${chatEnabled ? 'border-brand bg-brand-light' : 'border-gray-200'}`}>
            <span className="text-xs font-bold">💬 چت</span>
            <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} className="accent-[#a62626]" />
          </label>
        </div>

        <div className="flex gap-2 border-t border-gray-100 pt-5">
          <button onClick={save} disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-50">
            {busy && <Spinner />}
            {busy ? 'در حال ذخیره و آپلود...' : '✓ ذخیره تغییرات'}
          </button>
          <Link href="/my-ads" className="rounded-2xl border border-gray-200 px-6 py-3.5 text-gray-500 transition hover:border-gray-300">
            انصراف
          </Link>
        </div>
      </div>
    </div>
  );
}
