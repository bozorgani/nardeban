'use client';

import ErrorState from '../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در بارگذاری گفتگوها" message="مشکلی در نمایش چت پیش آمد. لطفاً دوباره تلاش کنید." />;
}
