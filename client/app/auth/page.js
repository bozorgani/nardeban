'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, digitsOnly } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  const codeRef = useRef(null);

  // شمارش معکوس ارسال مجدد
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  useEffect(() => {
    if (step === 2) codeRef.current?.focus();
  }, [step]);

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/request-otp', { method: 'POST', body: { phone: digitsOnly(phone) } });
      setDemoCode(data.demoCode || '');
      setStep(2);
      setTimer(60);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/verify-otp', {
        method: 'POST',
        body: { phone: digitsOnly(phone), code: digitsOnly(code) },
      });
      login(data.token, data.user);
      router.push('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  // تایید خودکار وقتی ۶ رقم کامل شد
  useEffect(() => {
    if (step === 2 && digitsOnly(code).length === 6 && !busy) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="mx-auto max-w-sm">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {/* هدر برند */}
        <div className="bg-gradient-to-br from-brand to-brand-dark px-8 py-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/></svg>
          </span>
          <h1 className="mt-3 text-lg font-black text-white">
            {step === 1 ? 'ورود به نردبان' : 'کد تایید'}
          </h1>
          <p className="mt-1 text-xs text-white/75">
            {step === 1 ? 'با شماره موبایل وارد شوید' : (
              <>کد ۶ رقمی به <b dir="ltr">{phone}</b> ارسال شد</>
            )}
          </p>
        </div>

        <div className="p-7">
          {error && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">⚠️ {error}</p>
          )}

          {step === 1 ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="relative">
                <input
                  dir="ltr"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 11))}
                  placeholder="0912 345 6789"
                  autoFocus
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 text-center text-lg tracking-[0.2em] outline-none transition focus:border-brand focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2" strokeLinecap="round"/></svg>
                </span>
              </div>
              <button
                disabled={busy || digitsOnly(phone).length !== 11}
                className="w-full rounded-2xl bg-brand py-4 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-40 disabled:shadow-none"
              >
                {busy ? 'در حال ارسال...' : 'دریافت کد تایید'}
              </button>
              <p className="text-center text-[11px] leading-6 text-gray-400">
                ورود شما به معنای پذیرش قوانین نردبان است.
              </p>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              {demoCode && (
                <p className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-sm text-blue-700">
                  💡 حالت دمو — کد: <b dir="ltr" className="tracking-widest">{demoCode}</b>
                </p>
              )}
              <input
                ref={codeRef}
                dir="ltr"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
                placeholder="— — — — —"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 text-center text-2xl font-bold tracking-[0.4em] outline-none transition focus:border-brand focus:bg-white"
              />
              <button
                disabled={busy || digitsOnly(code).length !== 6}
                className="w-full rounded-2xl bg-brand py-4 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-40 disabled:shadow-none"
              >
                {busy ? 'در حال بررسی...' : 'تایید و ورود'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => { setStep(1); setError(''); }} className="text-gray-400 hover:text-brand">
                  ← تغییر شماره
                </button>
                {timer > 0 ? (
                  <span className="text-gray-400">
                    ارسال مجدد تا {timer.toLocaleString('fa-IR')} ثانیه
                  </span>
                ) : (
                  <button type="button" onClick={requestOtp} className="font-bold text-brand">
                    ارسال مجدد کد
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
