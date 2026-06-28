import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, match: /^09\d{9}$/ },
    name: { type: String, default: '' },
    city: { type: String, default: 'تهران' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }],
    // نسخهٔ توکن (SEC): با هر logout «همه‌جا» یا تغییر امنیتی، +۱ می‌شود.
    // JWT شامل tv است؛ اگر با tokenVersion کاربر نخواند، توکن باطل است
    // (revocation بدون نیاز به blacklist سمت سرور).
    tokenVersion: { type: Number, default: 0 },
    // OTP — کد به‌صورت هش (SHA-256) ذخیره می‌شود، نه plaintext (SEC-08)
    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    // ضد brute-force per-phone (SEC-07)
    otpAttempts: { type: Number, default: 0, select: false }, // تلاش‌های ناموفق verify
    otpLockedUntil: { type: Date, select: false }, // قفل موقت پس از تلاش زیاد
    // ضد بمباران SMS per-phone (مستقل از IP) — سقف درخواست کد در پنجرهٔ زمانی
    otpRequestCount: { type: Number, default: 0, select: false },
    otpRequestWindowStart: { type: Date, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
