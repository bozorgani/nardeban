import Conversation from '../models/Conversation.js';

/**
 * به‌روزرسانی‌های اتمیک شمارندهٔ نخوانده‌ها (BE-02)
 * ----------------------------------------------------------------------------
 * به‌جای الگوی ناامن «خواندن → تغییر → save()» که در ارسال/خواندن همزمان پیام‌ها
 * باعث lost-update می‌شد، از عملگرهای اتمیک Mongo ($inc / $set) استفاده می‌کنیم.
 * این تضمین می‌کند دو پیام همزمان شمارنده را خراب نکنند.
 */

/**
 * با ارسال یک پیام جدید: شمارندهٔ نخواندهٔ «گیرنده» را اتمیک +۱ می‌کند و
 * فیلدهای آخرین پیام را ست می‌کند.
 * @param {string|import('mongoose').Types.ObjectId} convId
 * @param {boolean} senderIsSeller  آیا فرستنده، فروشندهٔ گفتگوست؟
 * @param {{ lastMessage: string, lastMessageAt: Date, lastSender: any }} fields
 */
export function incUnreadForRecipient(convId, senderIsSeller, fields) {
  // اگر فرستنده فروشنده است، نخواندهٔ خریدار بالا می‌رود و برعکس
  const recipientField = senderIsSeller ? 'unreadBuyer' : 'unreadSeller';
  return Conversation.updateOne(
    { _id: convId },
    { $inc: { [recipientField]: 1 }, $set: fields }
  );
}

/**
 * هنگام خواندن گفتگو: شمارندهٔ نخواندهٔ «خوانندهٔ فعلی» را اتمیک صفر می‌کند.
 * @param {string|import('mongoose').Types.ObjectId} convId
 * @param {boolean} readerIsSeller  آیا خوانندهٔ فعلی، فروشندهٔ گفتگوست؟
 */
export function resetUnreadForReader(convId, readerIsSeller) {
  const myField = readerIsSeller ? 'unreadSeller' : 'unreadBuyer';
  return Conversation.updateOne({ _id: convId }, { $set: { [myField]: 0 } });
}
