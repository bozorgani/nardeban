'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api, API_URL, getToken, digitsOnly } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import CategoryFields from '../../components/CategoryFields';

const MapPicker = dynamic(() => import('../../components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border bg-gray-50 text-sm text-gray-400">
      در حال بارگذاری نقشه...
    </div>
  ),
});

const STEPS = [
  { id: 1, title: 'عکس و عنوان', icon: '🖼️' },
  { id: 2, title: 'دسته‌بندی', icon: '🗂️' },
  { id: 3, title: 'موقعیت مکانی', icon: '📍' },
  { id: 4, title: 'ویژگی‌ها و قیمت', icon: '⚙️' },
  { id: 5, title: 'راه‌های تماس', icon: '📞' },
];

const CONDITIONS = ['نو', 'در حد نو', 'کارکرده', 'نیاز به تعمیر'];

export default function NewAdWizard() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [tree, setTree] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // ---- داده‌های فرم ----
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // مسیر انتخاب دسته (پشتیبانی از هر عمق — تا ۳ سطح)
  const [catPath, setCatPath] = useState([]); // [سطح۱, سطح۲, ...]
  const currentCat = catPath[catPath.length - 1] || null;
  const currentChildren = currentCat ? currentCat.children || [] : tree;

  const [location, setLocation] = useState(null); // {lat,lng}
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [itemType, setItemType] = useState('');
  const [attrs, setAttrs] = useState({}); // فیلدهای اختصاصی دسته
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [model, setModel] = useState('');
  const [features, setFeatures] = useState('');

  const [contactPhone, setContactPhone] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [callEnabled, setCallEnabled] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (user) setContactPhone((p) => p || user.phone);
  }, [loading, user, router]);

  useEffect(() => {
    api('/categories').then((d) => setTree(d.tree || [])).catch(() => {});
  }, []);

  const [mainIndex, setMainIndex] = useState(0); // ایندکس عکس اصلی

  const onFiles = (e) => {
    // افزودن به عکس‌های قبلی (تا سقف ۵)
    const incoming = Array.from(e.target.files);
    const list = [...files, ...incoming].slice(0, 5);
    setFiles(list);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews(list.map((f) => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removeImage = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((arr) => arr.filter((_, idx) => idx !== i));
    setPreviews((arr) => arr.filter((_, idx) => idx !== i));
    setMainIndex((m) => (i === m ? 0 : i < m ? m - 1 : m));
  };

  // اعتبارسنجی هر مرحله
  const stepError = useMemo(() => {
    switch (step) {
      case 1:
        if (title.trim().length < 5) return 'عنوان باید حداقل ۵ حرف باشد';
        if (description.trim().length < 10) return 'توضیحات باید حداقل ۱۰ حرف باشد';
        return '';
      case 2:
        if (!currentCat) return 'یک دسته‌بندی انتخاب کنید';
        if (currentCat.children?.length) return 'زیردستهٔ دقیق‌تر را انتخاب کنید';
        return '';
      case 3:
        if (!city.trim()) return 'شهر آگهی مشخص نیست — روی نقشه انتخاب یا جستجو کنید';
        return '';
      case 4:
        if (!isFree && price && Number(price) < 0) return 'قیمت نامعتبر است';
        return '';
      case 5:
        if (!/^09\d{9}$/.test(digitsOnly(contactPhone))) return 'شماره تماس معتبر نیست';
        if (!chatEnabled && !callEnabled) return 'حداقل یک راه تماس را فعال کنید';
        return '';
      default:
        return '';
    }
  }, [step, title, description, catPath, currentCat, city, isFree, price, contactPhone, chatEnabled, callEnabled]);

  const next = () => {
    if (stepError) return setError(stepError);
    setError('');
    setStep((s) => Math.min(5, s + 1));
  };
  const back = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    if (stepError) return setError(stepError);
    setError('');
    setBusy(true);

    const fd = new FormData();
    fd.set('title', title.trim());
    fd.set('description', description.trim());
    fd.set('category', currentCat._id);
    fd.set('city', city.trim());
    fd.set('neighborhood', neighborhood.trim());
    if (location) {
      fd.set('lat', location.lat);
      fd.set('lng', location.lng);
    }
    fd.set('isFree', String(isFree));
    fd.set('price', isFree ? '0' : price || '0');
    fd.set('itemType', itemType.trim());
    fd.set('condition', condition);
    fd.set('model', model.trim());
    fd.set('features', features.trim());
    fd.set('attrs', JSON.stringify(attrs));
    fd.set('contactPhone', digitsOnly(contactPhone));
    fd.set('chatEnabled', String(chatEnabled));
    fd.set('callEnabled', String(callEnabled));
    // عکس اصلی همیشه اول ارسال می‌شود
    const ordered = files.length
      ? [files[mainIndex], ...files.filter((_, i) => i !== mainIndex)]
      : [];
    ordered.forEach((f) => fd.append('images', f));

    try {
      const res = await fetch(`${API_URL}/api/ads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'خطا در ثبت آگهی');
      toast.success('آگهی شما ثبت شد و پس از تایید مدیر منتشر می‌شود', { title: '⏳ در انتظار بررسی', duration: 6000 });
      router.push('/my-ads');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loading || !user) return <p className="py-10 text-center text-gray-400">در حال بارگذاری...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      {/* نوار پیشرفت */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                className="flex flex-col items-center gap-1"
                title={s.title}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                    s.id === step
                      ? 'bg-brand text-white shadow-md'
                      : s.id < step
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s.id < step ? '✓' : s.id.toLocaleString('fa-IR')}
                </span>
                <span className={`hidden text-[10px] sm:block ${s.id === step ? 'font-bold text-brand' : 'text-gray-400'}`}>
                  {s.title}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded ${s.id < step ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-lg font-extrabold">
          {STEPS[step - 1].icon} {STEPS[step - 1].title}
        </h1>
        <p className="mb-5 text-xs text-gray-400">مرحله {step.toLocaleString('fa-IR')} از ۵</p>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">⚠️ {error}</p>
        )}

        {/* ====== مرحله ۱: عکس + عنوان + توضیحات ====== */}
        {step === 1 && (
          <div className="space-y-5 text-sm">
            <div>
              <label className="mb-2 block font-bold">عکس آگهی (تا ۵ عدد)</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-brand hover:text-brand">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.2-2h3.6L15 6"/></svg>
                  <span className="text-[10px]">افزودن عکس</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFiles} />
                </label>
                {previews.map((src, i) => (
                  <div key={src} className="relative h-24 w-24">
                    <button
                      type="button"
                      onClick={() => setMainIndex(i)}
                      title="انتخاب به عنوان عکس اصلی"
                      className={`block h-full w-full overflow-hidden rounded-xl border-2 transition ${
                        i === mainIndex ? 'border-brand ring-2 ring-brand/30' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                    {i === mainIndex ? (
                      <span className="absolute bottom-1 right-1 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                        ★ عکس اصلی
                      </span>
                    ) : (
                      <span className="absolute bottom-1 right-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition hover:opacity-100">
                        انتخاب
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                فرمت JPG / PNG / WebP — هر عکس حداکثر ۵ مگابایت · روی عکس بزنید تا «عکس اصلی» شود
              </p>
            </div>

            <div>
              <label className="mb-1.5 block font-bold">عنوان آگهی *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="مثلاً: گوشی آیفون ۱۳ در حد نو"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
              />
              <p className="mt-1 text-left text-[10px] text-gray-300">{title.length.toLocaleString('fa-IR')}/۸۰</p>
            </div>

            <div>
              <label className="mb-1.5 block font-bold">توضیحات *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={3000}
                placeholder="جزئیات کالا یا خدمات، دلیل فروش، شرایط و..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* ====== مرحله ۲: دسته‌بندی (۳ سطحی) ====== */}
        {step === 2 && (
          <div className="text-sm">
            {/* بردکرامب مسیر انتخاب */}
            {catPath.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCatPath([])}
                  className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600 transition hover:bg-gray-200"
                >
                  همهٔ دسته‌ها
                </button>
                {catPath.map((c, i) => (
                  <span key={c._id} className="flex items-center gap-1.5">
                    <span className="text-gray-300">›</span>
                    <button
                      type="button"
                      onClick={() => setCatPath(catPath.slice(0, i + 1))}
                      className={`rounded-full px-3 py-1.5 transition ${
                        i === catPath.length - 1
                          ? 'bg-brand-light font-bold text-brand'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i === 0 && `${c.icon} `}{c.name}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {currentCat && !currentCat.children?.length ? (
              <p className="rounded-xl bg-green-50 p-4 text-green-700">
                ✓ دستهٔ «{currentCat.name}» انتخاب شد — ادامه دهید.
              </p>
            ) : (
              <>
                <p className="mb-3 text-gray-500">
                  {catPath.length === 0 ? 'دسته‌بندی آگهی را انتخاب کنید:' : `زیردستهٔ «${currentCat.name}» را انتخاب کنید:`}
                </p>
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                  {currentChildren.map((c) => (
                    <li key={c._id}>
                      <button
                        type="button"
                        onClick={() => setCatPath([...catPath, c])}
                        className="flex w-full items-center justify-between px-4 py-3.5 transition hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-3">
                          {catPath.length === 0 && (
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl">
                              {c.icon}
                            </span>
                          )}
                          <span className="font-bold text-gray-700">{c.name}</span>
                        </span>
                        <span className="text-gray-300">{c.children?.length ? '◀' : '✓'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ====== مرحله ۳: موقعیت روی نقشه ====== */}
        {step === 3 && (
          <div className="space-y-4 text-sm">
            <MapPicker
              value={location}
              onChange={setLocation}
              onCityDetect={(c) => setCity(c)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-bold">شهر *</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="با انتخاب روی نقشه پر می‌شود"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-bold">محله</label>
                <input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="مثلاً: سعادت‌آباد"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
                />
              </div>
            </div>
            <p className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs leading-6 text-blue-700">
              💡 موقعیت دقیق شما به بازدیدکنندگان نمایش داده نمی‌شود؛ فقط یک محدودهٔ تقریبی روی نقشه دیده می‌شود.
            </p>
          </div>
        )}

        {/* ====== مرحله ۴: ویژگی‌ها ====== */}
        {step === 4 && (
          <div className="space-y-5 text-sm">
            {/* فیلدهای اختصاصی دسته (برند/سال/متراژ/...) */}
            <CategoryFields
              categoryId={currentCat?._id}
              values={attrs}
              onChange={setAttrs}
            />

            <div>
              <label className="mb-1.5 block font-bold">نوع کالا / خدمات</label>
              <input
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                placeholder="مثلاً: گوشی هوشمند، آپارتمان، مبل راحتی..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-2 block font-bold">وضعیت کالا</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(condition === c ? '' : c)}
                    className={`rounded-full border px-4 py-2 text-xs transition ${
                      condition === c
                        ? 'border-brand bg-brand-light font-bold text-brand'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-bold">قیمت (تومان)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={price ? Number(price).toLocaleString('fa-IR') : ''}
                  onChange={(e) => setPrice(digitsOnly(e.target.value))}
                  disabled={isFree}
                  placeholder="خالی بگذارید = توافقی (مثلاً ۲۵٬۰۰۰٬۰۰۰)"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand disabled:bg-gray-100"
                />
                <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
                  رایگان
                </label>
              </div>
              {!isFree && price && (
                <p className="mt-1 text-xs font-bold text-green-700">
                  {Number(price).toLocaleString('fa-IR')} تومان
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block font-bold">مدل / برند</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="مثلاً: Samsung Galaxy S23 — پراید ۱۳۱ SE"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-bold">سایر ویژگی‌ها و امکانات</label>
              <textarea
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={3}
                placeholder="مثلاً: آسانسور، پارکینگ، گارانتی، رنگ مشکی..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* ====== مرحله ۵: راه‌های تماس + مرور ====== */}
        {step === 5 && (
          <div className="space-y-5 text-sm">
            <div>
              <label className="mb-1.5 block font-bold">شماره تماس *</label>
              <input
                dir="ltr"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                maxLength={11}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-center tracking-widest outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-bold">بازدیدکنندگان چطور با شما تماس بگیرند؟</label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:border-gray-300">
                <span className="flex items-center gap-2">📞 تماس تلفنی</span>
                <input type="checkbox" checked={callEnabled} onChange={(e) => setCallEnabled(e.target.checked)} className="h-4 w-4 accent-[#a62626]" />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:border-gray-300">
                <span className="flex items-center gap-2">💬 چت در نردبان</span>
                <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} className="h-4 w-4 accent-[#a62626]" />
              </label>
            </div>

            {/* خلاصه آگهی */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 font-extrabold text-gray-700">مرور نهایی آگهی</h3>
              <dl className="space-y-1.5 text-xs leading-6 text-gray-600">
                <div className="flex gap-2"><dt className="font-bold">عنوان:</dt><dd>{title}</dd></div>
                <div className="flex gap-2"><dt className="font-bold">دسته:</dt><dd>{catPath.map((c, i) => (i === 0 ? `${c.icon} ${c.name}` : c.name)).join(' › ')}</dd></div>
                <div className="flex gap-2"><dt className="font-bold">مکان:</dt><dd>{city}{neighborhood ? `، ${neighborhood}` : ''} {location ? '(روی نقشه ✓)' : ''}</dd></div>
                <div className="flex gap-2"><dt className="font-bold">قیمت:</dt><dd>{isFree ? 'رایگان' : price ? `${Number(price).toLocaleString('fa-IR')} تومان` : 'توافقی'}</dd></div>
                {condition && <div className="flex gap-2"><dt className="font-bold">وضعیت:</dt><dd>{condition}</dd></div>}
                {model && <div className="flex gap-2"><dt className="font-bold">مدل:</dt><dd>{model}</dd></div>}
                <div className="flex gap-2"><dt className="font-bold">عکس:</dt><dd>{files.length ? `${files.length.toLocaleString('fa-IR')} عدد` : 'بدون عکس'}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {/* دکمه‌های پیمایش */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 transition hover:border-gray-400"
            >
              → مرحله قبل
            </button>
          ) : (
            <span />
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              مرحله بعد ←
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? 'در حال ثبت...' : '✓ ثبت نهایی آگهی'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
