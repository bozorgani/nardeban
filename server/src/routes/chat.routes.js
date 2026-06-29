import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Ad from '../models/Ad.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { optimizeImages } from '../middleware/optimizeImages.js';
import { sendPushToUser } from '../push.js';
import { ioInstance, isUserOnline } from '../socket.js';
import { incUnreadForRecipient, resetUnreadForReader } from '../services/conversation.js';
import { parseCursor } from '../utils/cursor.js';

const router = Router();
router.use(requireAuth); // همهٔ مسیرهای چت نیاز به ورود دارند

const isMember = (conv, userId) =>
  conv.buyer.equals(userId) || conv.seller.equals(userId);

// لیست گفتگوهای من (خریدار یا فروشنده) — با pagination (M4)
//
// قبلاً همهٔ گفتگوهای کاربر یک‌جا برگردانده می‌شد. کاربری با هزاران گفتگو
// → پاسخ چند MB، مصرف زیاد حافظهٔ سرور و کلاینت، و TTFB بالا.
// حالا: page/limit با سقف منطقی + total و pages برای UI.
//
// نکته: totalUnread جداگانه از تمام رکوردهای کاربر (نه فقط صفحهٔ جاری)
// محاسبه می‌شود تا باج هدر چت درست بماند؛ برای این کار از همان aggregate سبک
// که در /unread-count داریم استفاده می‌کنیم.
router.get('/conversations', async (req, res, next) => {
  try {
    const uid = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const cursor = parseCursor(req.query.cursor);
    const filter = { $or: [{ buyer: uid }, { seller: uid }] };

    // حالت جدید: cursor-based (ترجیحی برای dataset بزرگ)
    // حالت قدیمی: page/limit با skip برای backward compatibility
    const listQuery = cursor
      ? {
          ...filter,
          $and: [
            {
              $or: [
                { lastMessageAt: { $lt: cursor.date } },
                { lastMessageAt: cursor.date, _id: { $lt: cursor.id } },
              ],
            },
          ],
        }
      : filter;

    const listPromise = Conversation.find(listQuery)
      .sort({ lastMessageAt: -1, _id: -1 })
      .limit(limit)
      .populate('ad', 'title images price isFree status')
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone')
      .lean();

    if (!cursor) listPromise.skip((page - 1) * limit);

    const [convs, total, allForUnread] = await Promise.all([
      listPromise,
      Conversation.countDocuments(filter),
      // فقط فیلدهای لازم برای جمع total unread — سبک
      Conversation.find(filter, 'buyer seller unreadBuyer unreadSeller').lean(),
    ]);

    const result = convs.map((c) => {
      const iAmSeller = String(c.seller._id) === String(uid);
      return {
        ...c,
        role: iAmSeller ? 'seller' : 'buyer',
        unread: iAmSeller ? c.unreadSeller : c.unreadBuyer,
        other: iAmSeller ? c.buyer : c.seller,
      };
    });

    const totalUnread = allForUnread.reduce(
      (s, c) => s + (String(c.seller) === String(uid) ? c.unreadSeller : c.unreadBuyer),
      0
    );

    res.json({
      conversations: result,
      totalUnread,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// تعداد کل پیام‌های نخوانده (برای باج هدر)
router.get('/unread-count', async (req, res, next) => {
  try {
    const uid = req.user._id;
    const convs = await Conversation.find(
      { $or: [{ buyer: uid }, { seller: uid }] },
      'buyer seller unreadBuyer unreadSeller'
    ).lean();
    const total = convs.reduce(
      (s, c) => s + (String(c.seller) === String(uid) ? c.unreadSeller : c.unreadBuyer),
      0
    );
    res.json({ total });
  } catch (err) {
    next(err);
  }
});

// شروع گفتگو (یا گرفتن گفتگوی موجود) برای یک آگهی — فقط خریدار
router.post('/conversations', async (req, res, next) => {
  try {
    // برای چت داشتن نام الزامی است (طرف مقابل باید بداند با چه کسی گفتگو می‌کند)
    if (!req.user.name || !req.user.name.trim())
      return res.status(400).json({ message: 'NAME_REQUIRED', code: 'NAME_REQUIRED' });

    const { adId } = req.body;
    if (!mongoose.isValidObjectId(adId))
      return res.status(400).json({ message: 'شناسه آگهی نامعتبر' });

    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (ad.owner.equals(req.user._id))
      return res.status(400).json({ message: 'نمی‌توانید با خودتان چت کنید' });
    if (ad.chatEnabled === false)
      return res.status(400).json({ message: 'چت برای این آگهی غیرفعال است' });

    // 🔒 M6: شروع گفتگوی جدید فقط روی آگهی فعال یا رزروشده مجاز است.
    // قبلاً مهاجم می‌توانست روی آگهی pending/rejected/hidden (که هنوز در
    // عموم منتشر نشده یا توسط ادمین مخفی شده) گفتگوی جدید باز کند —
    // یعنی فرستادن پیام به فروشنده‌ای که آگهی‌اش هنوز/دیگر منتشر نیست.
    // sold را هم می‌بندیم تا کاربر تازه‌رسیده روی آگهی فروخته‌شده چت جدید نزند
    // (گفتگوهای قبلی همچنان فعال‌اند تا تاریخچه‌ها از دست نروند).
    if (!['active', 'reserved'].includes(ad.status)) {
      return res
        .status(403)
        .json({ message: 'این آگهی در حال حاضر برای چت در دسترس نیست' });
    }

    let conv = await Conversation.findOne({ ad: adId, buyer: req.user._id });
    if (!conv) {
      try {
        conv = await Conversation.create({ ad: adId, buyer: req.user._id, seller: ad.owner });
      } catch (err) {
        if (err?.code === 11000) {
          conv = await Conversation.findOne({ ad: adId, buyer: req.user._id });
        } else {
          throw err;
        }
      }
    }
    res.json({ conversationId: conv._id });
  } catch (err) {
    next(err);
  }
});

// پیام‌های یک گفتگو + علامت‌گذاری به عنوان خوانده‌شده
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate('ad', 'title images price isFree status owner')
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone');
    if (!conv) return res.status(404).json({ message: 'گفتگو یافت نشد' });
    if (!isMember(conv, req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });

    // پیام‌های جدیدتر از یک شناسه (برای polling)
    const after = req.query.after;
    const filter = { conversation: conv._id };
    if (after && mongoose.isValidObjectId(after)) filter._id = { $gt: after };

    const messages = await Message.find(filter).sort({ _id: 1 }).limit(200).lean();

    // خوانده شد — ریست اتمیک شمارندهٔ نخواندهٔ خوانندهٔ فعلی (BE-02)
    const iAmSeller = conv.seller._id.equals(req.user._id);
    await Message.updateMany(
      { conversation: conv._id, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );
    await resetUnreadForReader(conv._id, iAmSeller);

    res.json({
      conversation: {
        _id: conv._id,
        ad: conv.ad,
        buyer: conv.buyer,
        seller: conv.seller,
        role: iAmSeller ? 'seller' : 'buyer',
        other: iAmSeller ? conv.buyer : conv.seller,
      },
      messages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * منطق مشترک ثبت پیام (متن و/یا عکس) + بروزرسانی گفتگو + رویدادهای real-time و push
 */
async function createMessage({ conv, user, text = '', image = '' }) {
  const msg = await Message.create({
    conversation: conv._id,
    sender: user._id,
    text,
    image,
  });

  const iAmSeller = conv.seller.equals(user._id);
  // به‌روزرسانی اتمیک: +۱ نخواندهٔ گیرنده و ست‌کردن آخرین پیام (BE-02)
  await incUnreadForRecipient(conv._id, iAmSeller, {
    lastMessage: text ? text.slice(0, 100) : '📷 عکس',
    lastMessageAt: new Date(),
    lastSender: user._id,
  });

  const plain = msg.toObject();
  const convId = String(conv._id);
  const otherId = String(iAmSeller ? conv.buyer : conv.seller);

  // ⚡ real-time به روم گفتگو و نوتیف سراسری گیرنده + همگام‌سازی تب‌های فرستنده (M8)
  if (ioInstance) {
    ioInstance.to(`conv:${convId}`).emit('msg:new', { convId, message: plain });
    ioInstance.to(`user:${otherId}`).emit('msg:notify', {
      convId,
      message: plain,
      adId: String(conv.ad),
    });
    // M8: تب‌های دیگرِ خود فرستنده هم لیست گفتگوها/آخرین پیام را به‌روز کنند
    // (با علامت self تا unread counter را اشتباه بالا نبرند).
    ioInstance.to(`user:${String(user._id)}`).emit('msg:notify', {
      convId,
      message: plain,
      adId: String(conv.ad),
      self: true,
    });
  }

  // 📲 Web Push اگر گیرنده آفلاین است
  if (!isUserOnline(otherId)) {
    const ad = await Ad.findById(conv.ad).select('title').lean();
    sendPushToUser(otherId, {
      title: `پیام جدید از ${user.name || 'کاربر بفروش'}`,
      body: text ? (text.length > 80 ? text.slice(0, 80) + '…' : text) : '📷 یک عکس فرستاد',
      tag: `conv-${convId}`,
      url: `/chat?c=${convId}`,
      adTitle: ad?.title || '',
    }).catch(() => {});
  }

  return plain;
}

// ارسال پیام متنی
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'متن پیام خالی است' });
    if (text.length > 2000) return res.status(400).json({ message: 'پیام بیش از حد طولانی است' });

    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'گفتگو یافت نشد' });
    if (!isMember(conv, req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });

    const message = await createMessage({ conv, user: req.user, text });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// 📷 ارسال عکس (با کپشن اختیاری) — multipart: image + text?
router.post(
  '/conversations/:id/images',
  upload.single('image'),
  optimizeImages,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'عکسی انتخاب نشده است' });

      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ message: 'گفتگو یافت نشد' });
      if (!isMember(conv, req.user._id))
        return res.status(403).json({ message: 'دسترسی ندارید' });

      const text = (req.body.text || '').trim().slice(0, 2000);
      const message = await createMessage({
        conv,
        user: req.user,
        text,
        image: `/uploads/${req.file.filename}`,
      });
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

// لیست گفتگوهای یک آگهی خاص — فقط برای صاحب آگهی (فروشنده)
router.get('/ad/:adId/conversations', async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.adId);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'فقط صاحب آگهی به این لیست دسترسی دارد' });

    const convs = await Conversation.find({ ad: ad._id })
      .sort({ lastMessageAt: -1 })
      .populate('buyer', 'name phone')
      .lean();

    res.json({
      conversations: convs.map((c) => ({ ...c, unread: c.unreadSeller })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
