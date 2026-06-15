import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, match: /^09\d{9}$/ },
    name: { type: String, default: '' },
    city: { type: String, default: 'تهران' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }],
    // OTP (در نسخه دمو، کد در پاسخ API برگردانده می‌شود)
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
