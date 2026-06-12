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
    images: [{ type: String }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactPhone: { type: String, required: true },
    chatEnabled: { type: Boolean, default: true },
    callEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'reserved', 'sold', 'hidden'], default: 'active' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

adSchema.index({ title: 'text', description: 'text' });
adSchema.index({ createdAt: -1 });

export default mongoose.model('Ad', adSchema);
