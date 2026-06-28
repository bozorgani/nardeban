import mongoose from 'mongoose';

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 3000 },
    price: { type: Number, default: 0 }, // 0 => توافقی
    isFree: { type: Boolean, default: false }, // رایگان
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    city: { type: String, required: true, index: true },
    neighborhood: { type: String, default: '' },
    // مختصات روی نقشه
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // ویژگی‌ها
    condition: { type: String, enum: ['', 'نو', 'در حد نو', 'کارکرده', 'نیاز به تعمیر'], default: '' },
    itemType: { type: String, default: '' }, // نوع کالا
    model: { type: String, default: '' }, // مدل / برند
    features: { type: String, default: '' }, // سایر ویژگی‌ها و امکانات
    // فیلدهای اختصاصی دسته (برند، سال، متراژ، ...) — کلید/مقدار
    attrs: { type: Map, of: String, default: {} },
    images: [{ type: String }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactPhone: { type: String, required: true },
    chatEnabled: { type: Boolean, default: true },
    callEnabled: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'reserved', 'sold', 'hidden', 'rejected'],
      default: 'pending', // هر آگهی جدید ابتدا در انتظار تایید مدیر
    },
    rejectReason: { type: String, default: '' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

adSchema.index({ title: 'text', description: 'text' });
adSchema.index({ createdAt: -1 });
// ایندکس‌های مرکب برای کوئری لیست (status همیشه در فیلتر هست)
// ------------------------------------------------------------------
// ۱) لیست عمومی بر اساس جدیدترین‌ها
adSchema.index({ status: 1, createdAt: -1 });
// ۲) فیلتر شهر + جدیدترین‌ها
adSchema.index({ status: 1, city: 1, createdAt: -1 });
// ۳) فیلتر دسته + جدیدترین‌ها
adSchema.index({ status: 1, category: 1, createdAt: -1 });
// ۴) آگهی‌های مشابه: status + category + city + createdAt
//    تا کوئری same-city در /ads/:id/similar کاملاً ایندکس‌محور بماند.
adSchema.index({ status: 1, category: 1, city: 1, createdAt: -1 });
// ۵) sort ارزان‌ترین/گران‌ترین در لیست عمومی
//    چون status همیشه در filter هست، price باید ستون دوم باشد.
adSchema.index({ status: 1, price: 1 });
adSchema.index({ status: 1, price: -1 });
// ۶) /ads/mine → فیلتر owner + مرتب‌سازی createdAt
adSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('Ad', adSchema);
