'use client';

import ErrorState from '../../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در نمایش آگهی" message="مشکلی در بارگذاری این آگهی پیش آمد." />;
}
