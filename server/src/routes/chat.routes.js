import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Ad from '../models/Ad.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPushToUser } from '../push.js';

const router = Router();
router.use(requireAuth); // همهٔ مسیرهای چت نیاز به ورود دارند

const isMember = (conv, userId) =>
  conv.buyer.equals(userId) || conv.seller.equals(userId);

// لیست همهٔ گفتگوهای من (خریدار یا فروشنده)
router.get('/conversations', async (req, res, next) => {
  try {
    const uid = req.user._id;
    const convs = await Conversation.find({ $or: [{ buyer: uid }, { seller: uid }] })
      .sort({ lastMessageAt: -1 })
      .populate('ad', 'title images price isFree status')
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone')
      .lean();

    const result = convs.map((c) => {
      const iAmSeller = String(c.seller._id) === String(uid);
      return {
        ...c,
        role: iAmSeller ? 'seller' : 'buyer',
        unread: iAmSeller ? c.unreadSeller : c.unreadBuyer,
        other: iAmSeller ? c.buyer : c.seller,
      };
    });

    const totalUnread = result.reduce((s, c) => s + (c.unread || 0), 0);
    res.json({ conversations: result, totalUnread });
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

    let conv = await Conversation.findOne({ ad: adId, buyer: req.user._id });
    if (!conv) {
      conv = await Conversation.create({ ad: adId, buyer: req.user._id, seller: ad.owner });
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

    // خوانده شد
    const iAmSeller = conv.seller._id.equals(req.user._id);
    await Message.updateMany(
      { conversation: conv._id, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );
    if (iAmSeller) conv.unreadSeller = 0;
    else conv.unreadBuyer = 0;
    await conv.save();

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

// ارسال پیام
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'متن پیام خالی است' });
    if (text.length > 2000) return res.status(400).json({ message: 'پیام بیش از حد طولانی است' });

    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'گفتگو یافت نشد' });
    if (!isMember(conv, req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      text,
    });

    conv.lastMessage = text.slice(0, 100);
    conv.lastMessageAt = new Date();
    conv.lastSender = req.user._id;
    const iAmSeller = conv.seller.equals(req.user._id);
    if (iAmSeller) conv.unreadBuyer += 1;
    else conv.unreadSeller += 1;
    await conv.save();

    // 📲 Web Push برای گیرنده (مسیر REST — مثلاً وقتی سوکت فرستنده قطع بوده)
    const otherId = iAmSeller ? conv.buyer : conv.seller;
    const ad = await Ad.findById(conv.ad).select('title').lean();
    sendPushToUser(otherId, {
      title: `پیام جدید از ${req.user.name || 'کاربر نردبان'}`,
      body: text.length > 80 ? text.slice(0, 80) + '…' : text,
      tag: `conv-${conv._id}`,
      url: `/chat?c=${conv._id}`,
      adTitle: ad?.title || '',
    }).catch(() => {});

    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});

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
