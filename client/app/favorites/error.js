'use client';

import ErrorState from '../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در نشان‌شده‌ها" message="مشکلی در نمایش نشان‌شده‌ها پیش آمد." />;
}
