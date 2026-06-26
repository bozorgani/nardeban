'use client';

import ErrorState from '../../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در پروفایل فروشنده" message="مشکلی در نمایش این پروفایل پیش آمد." />;
}
