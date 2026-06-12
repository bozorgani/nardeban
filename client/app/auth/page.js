'use client';

import { useState } from 'react';
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

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/request-otp', { method: 'POST', body: { phone: digitsOnly(phone) } });
      setDemoCode(data.demoCode || '');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6">
      <h1 className="mb-1 text-lg font-extrabold">ورود به نردبان</h1>
      <p className="mb-5 text-sm text-gray-500">
        {step === 1
          ? 'برای استفاده از امکانات، شماره موبایل خود را وارد کنید.'
          : `کد ۵ رقمی ارسال‌شده به ${phone} را وارد کنید.`}
      </p>

      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {step === 1 ? (
        <form onSubmit={requestOtp} className="space-y-3">
          <input
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09123456789"
            maxLength={11}
            className="w-full rounded-lg border px-3 py-2 text-center tracking-widest outline-none focus:border-brand"
          />
          <button
            disabled={busy}
            className="w-full rounded-lg bg-brand py-2 font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? '...' : 'دریافت کد تایید'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          {demoCode && (
            <p className="rounded-lg bg-blue-50 p-2 text-center text-sm text-blue-700">
              💡 حالت دمو — کد تایید: <b dir="ltr">{demoCode}</b>
            </p>
          )}
          <input
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="— — — — —"
            maxLength={5}
            className="w-full rounded-lg border px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-brand"
          />
          <button
            disabled={busy}
            className="w-full rounded-lg bg-brand py-2 font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? '...' : 'تایید و ورود'}
          </button>
          <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500">
            تغییر شماره
          </button>
        </form>
      )}
    </div>
  );
}
