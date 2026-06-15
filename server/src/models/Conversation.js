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

export default mongoose.model('Conversation', conversationSchema);
