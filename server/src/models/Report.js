import mongoose from 'mongoose';

export const REPORT_REASONS = [
  'فروش ممنوعه یا غیرقانونی',
  'کلاهبرداری یا قیمت غیرواقعی',
  'محتوای نامناسب یا توهین‌آمیز',
  'آگهی تکراری یا اسپم',
  'دسته‌بندی اشتباه',
  'اطلاعات تماس نادرست',
  'سایر موارد',
];

const reportSchema = new mongoose.Schema(
  {
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true, index: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, enum: REPORT_REASONS },
    details: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    // اقدام ادمین
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// هر کاربر برای هر آگهی فقط یک گزارش باز
reportSchema.index({ ad: 1, reporter: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
