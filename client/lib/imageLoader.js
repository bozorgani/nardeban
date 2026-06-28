/**
 * Image loader passthrough برای next/image (F2)
 * ----------------------------------------------------------------------------
 * چرا این loader؟
 *   - عکس‌های آپلودی پروژه از قبل با sharp به webp (و thumbnail 288px) تبدیل
 *     شده‌اند؛ نیازی به optimization دوم سمت Next نیست (بدون این loader،
 *     Next می‌خواهد عکس را دانلود، re-encode و sized کند → CPU اضافی + کش
 *     پر می‌شود + با next/image روی Standalone باید sharp روی image-server
 *     هم نصب باشد).
 *   - با passthrough loader: کنترل CLS/srcset/lazy از next/image حفظ می‌شود
 *     ولی URL همان است که ما داریم → برای استقرار ساده.
 *
 * نکته: `width` و `quality` که next می‌فرستد را نادیده می‌گیریم چون عکس‌ها
 * با ابعاد ثابت روی سرور آماده شده‌اند (288px thumb و 1600px main).
 */
export default function imageLoader({ src }) {
  return src;
}
