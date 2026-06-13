import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // معیارهای جستجو (همان query string صفحه اصلی)
    query: { type: String, default: '' }, // q
    category: { type: String, default: '' }, // slug
    city: { type: String, default: '' }, // با کاما
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },
    attrs: { type: Map, of: String, default: {} }, // attr_brand و... (بدون پیشوند)
    // برچسب خوانا برای نمایش
    label: { type: String, required: true, maxlength: 120 },
    // اعلان
    notify: { type: Boolean, default: true },
    lastCheckedAt: { type: Date, default: Date.now },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

savedSearchSchema.index({ user: 1, createdAt: -1 });
// سقف منطقی per کاربر در روت کنترل می‌شود

export default mongoose.model('SavedSearch', savedSearchSchema);
