import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    unreadBuyer: { type: Number, default: 0 },
    unreadSeller: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// هر خریدار برای هر آگهی فقط یک گفتگو
conversationSchema.index({ ad: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });
// لیست گفتگوهای کاربر همیشه با یکی از این دو الگو خوانده می‌شود:
//   - buyer=<uid>  sort(lastMessageAt desc)
//   - seller=<uid> sort(lastMessageAt desc)
// بنابراین به‌جای تکیه بر $or + sort بدون ایندکس مرکب، برای هر نقش یک ایندکس
// جدا می‌گذاریم تا Mongo هر شاخه را مستقیم از ایندکس بخواند.
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
