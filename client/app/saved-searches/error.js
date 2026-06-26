'use client';

import ErrorState from '../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در جستجوهای ذخیره‌شده" message="مشکلی در بارگذاری جستجوها پیش آمد." />;
}
