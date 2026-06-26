'use client';

import ErrorState from '../../components/ErrorState';

export default function Error({ error, reset }) {
  return <ErrorState reset={reset} title="خطا در پنل مدیریت" message="مشکلی در بارگذاری پنل پیش آمد. لطفاً دوباره تلاش کنید." />;
}
