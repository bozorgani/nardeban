import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

// هر کاربر فقط یک امتیاز برای هر فروشنده (قابل ویرایش)
reviewSchema.index({ seller: 1, rater: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
