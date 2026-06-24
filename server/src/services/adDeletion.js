import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import { deleteUploads } from '../utils/files.js';

/**
 * حذف آبشاری امن یک آگهی (BE-01)
 * ----------------------------------------------------------------------------
 * یک آگهی به‌همراه همهٔ وابسته‌هایش حذف می‌شود:
 *   - گفتگوها (Conversation)
 *   - پیام‌ها (Message)
 *   - گزارش‌های تخلف (Report)
 *   - فایل‌های عکس روی دیسک (آگهی + پیام‌های چت)
 *
 * تضمین یکپارچگی:
 *   ۱) اگر دیتابیس از تراکنش پشتیبانی کند (replica set / Atlas)، همهٔ حذف‌های
 *      دیتابیس در یک تراکنش اتمیک انجام می‌شوند → یا همه یا هیچ (بدون دادهٔ یتیم).
 *   ۲) اگر تراکنش پشتیبانی نشود (MongoDB standalone)، به یک توالی مرتبِ امن
 *      برمی‌گردیم: ابتدا فرزندان (پیام‌ها → گفتگوها → گزارش‌ها) و در پایان خود
 *      آگهی حذف می‌شود؛ بنابراین در صورت خطای میانه، آگهی هنوز موجود است و
 *      عملیات قابل تکرار (idempotent) می‌ماند.
 *   ۳) فایل‌های دیسک فقط پس از موفقیت کامل حذفِ دیتابیس پاک می‌شوند (هرگز فایل
 *      حذف نمی‌شود مگر اینکه رکوردهای آن قطعاً از DB رفته باشند).
 *
 * @param {string|mongoose.Types.ObjectId} adId
 * @returns {Promise<object|null>}  سند آگهی حذف‌شده (lean) یا null اگر یافت نشد
 */
export async function deleteAdCascade(adId) {
  // ابتدا آگهی را می‌خوانیم تا مسیر عکس‌هایش را داشته باشیم (فارغ از مسیر اجرا)
  const ad = await Ad.findById(adId).lean();
  if (!ad) return null;

  let chatImagePaths = [];

  // ---------- تلاش با تراکنش ----------
  let session = null;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      chatImagePaths = await purgeChildrenAndAd(adId, session);
    });
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      // ---------- fallback بدون تراکنش (توالی مرتب) ----------
      chatImagePaths = await purgeChildrenAndAd(adId, null);
    } else {
      throw err;
    }
  } finally {
    if (session) await session.endSession().catch(() => {});
  }

  // ---------- حذف فایل‌ها (فقط پس از موفقیت DB) ----------
  deleteUploads([...(ad.images || []), ...chatImagePaths]);

  return ad;
}

/**
 * حذف فرزندان و سپس خود آگهی.
 * ترتیب: جمع‌آوری مسیر عکس پیام‌ها → حذف پیام‌ها → گفتگوها → گزارش‌ها → آگهی.
 * با session داده‌شده (تراکنشی) یا بدون session (fallback) کار می‌کند.
 * @returns {Promise<string[]>} مسیر عکس‌های داخل پیام‌های چت برای حذف از دیسک
 */
async function purgeChildrenAndAd(adId, session) {
  const opt = session ? { session } : {};

  const convs = await Conversation.find({ ad: adId }, null, opt).select('_id');
  const convIds = convs.map((c) => c._id);

  const imgMsgs = await Message.find(
    { conversation: { $in: convIds }, image: { $ne: '' } },
    null,
    opt
  ).select('image');
  const chatImagePaths = imgMsgs.map((m) => m.image).filter(Boolean);

  await Message.deleteMany({ conversation: { $in: convIds } }, opt);
  await Conversation.deleteMany({ ad: adId }, opt);
  await Report.deleteMany({ ad: adId }, opt);
  await Ad.deleteOne({ _id: adId }, opt);

  return chatImagePaths;
}

/**
 * آیا خطا به‌خاطر نبود پشتیبانی تراکنش است؟ (MongoDB standalone)
 * در این صورت باید به مسیر fallback برویم؛ سایر خطاها باید پرتاب شوند.
 */
function isTransactionUnsupported(err) {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    err.code === 20 || // IllegalOperation
    err.codeName === 'IllegalOperation' ||
    /Transaction numbers are only allowed on a replica set/i.test(msg) ||
    /Transactions are not supported/i.test(msg) ||
    /replica set/i.test(msg) ||
    /\bmongos\b/i.test(msg)
  );
}
