'use client';

import { useEffect, useRef } from 'react';

/**
 * دسترس‌پذیری مدال (a11y):
 *  - بستن با کلید Escape
 *  - focus trap: Tab/Shift+Tab داخل مدال می‌چرخد و بیرون نمی‌رود
 *  - فوکس اولیه روی اولین عنصر قابل‌فوکس + بازگرداندن فوکس به عنصر قبلی هنگام بستن
 *
 * استفاده:
 *   const ref = useModalA11y(open, onClose);
 *   <div ref={ref} role="dialog" aria-modal="true"> ... </div>
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y(open, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const prevFocused = typeof document !== 'undefined' ? document.activeElement : null;

    // فوکس اولیه روی اولین عنصر قابل‌فوکس داخل مدال (یا خود مدال)
    const focusables = () =>
      node ? Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null) : [];
    const first = focusables()[0];
    // عنصرهای autoFocus خودشان فوکس می‌گیرند؛ اگر نبود، اولین قابل‌فوکس
    if (first && document.activeElement === document.body) first.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        const els = focusables();
        if (els.length === 0) return;
        const firstEl = els[0];
        const lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // بازگرداندن فوکس به عنصری که قبل از باز شدن مدال فعال بود
      if (prevFocused && typeof prevFocused.focus === 'function') prevFocused.focus();
    };
  }, [open, onClose]);

  return ref;
}
