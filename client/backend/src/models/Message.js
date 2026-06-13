import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, maxlength: 2000, default: '' },
    image: { type: String, default: '' }, // مسیر عکس پیوست (/uploads/...)
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// پیام باید متن یا عکس داشته باشد
messageSchema.pre('validate', function (next) {
  if (!this.text?.trim() && !this.image) {
    return next(new Error('پیام خالی است'));
  }
  next();
});

export default mongoose.model('Message', messageSchema);
