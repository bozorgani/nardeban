'use client';

import ErrorState from '../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در آگهی‌های من" message="مشکلی در نمایش آگهی‌های شما پیش آمد." />;
}
