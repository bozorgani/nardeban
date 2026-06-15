import rateLimit from 'express-rate-limit';

const faMessage = (msg) => ({ message: msg });

// عمومی: ۳۰۰ درخواست در دقیقه per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: faMessage('درخواست‌های بیش از حد — کمی صبر کنید'),
});

// OTP: حداکثر ۵ درخواست کد در ۱۰ دقیقه per IP (ضد اسپم پیامک)
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: faMessage('تعداد درخواست کد بیش از حد مجاز است — ۱۰ دقیقه دیگر تلاش کنید'),
});

// تایید کد: ۱۰ تلاش در ۱۰ دقیقه (ضد brute-force کد ۵ رقمی)
export const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: faMessage('تلاش‌های ناموفق زیاد — ۱۰ دقیقه دیگر امتحان کنید'),
});

// نوشتن‌های سنگین (ثبت آگهی/گزارش): ۳۰ در ساعت
export const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: faMessage('سقف ثبت در این ساعت پر شده است'),
});
