import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import User from './models/User.js';

/**
 * معماری Real-time چت:
 *  - هر کاربر بعد از اتصال در روم شخصی `user:<id>` قرار می‌گیرد (برای نوتیف کلی)
 *  - با باز کردن یک گفتگو در روم `conv:<id>` join می‌شود (برای پیام/تایپ/خوانده‌شدن)
 *  - رویدادها:
 *      client → server : conv:join, conv:leave, msg:send, typing, msgs:read
 *      server → client : msg:new, msg:notify, typing, msgs:read, presence
 */

// نگهداری تعداد اتصال‌های باز هر کاربر (چند تب → یک کاربر)
const onlineUsers = new Map(); // userId -> Set<socketId>

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
  });

  // ---- احراز هویت هر اتصال با JWT ----
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const user = await User.findById(payload.id).select('_id name phone');
      if (!user) return next(new Error('unauthorized'));
      socket.userId = String(user._id);
      socket.userName = user.name || '';
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  // عضو بودن کاربر در گفتگو را چک می‌کند و آبجکت گفتگو را برمی‌گرداند
  async function memberConv(convId, userId) {
    const conv = await Conversation.findById(convId);
    if (!conv) return null;
    const isMember =
      String(conv.buyer) === String(userId) || String(conv.seller) === String(userId);
    return isMember ? conv : null;
  }

  io.on('connection', (socket) => {
    const uid = socket.userId;

    // روم شخصی برای نوتیف‌ها
    socket.join(`user:${uid}`);

    // presence: ثبت آنلاین شدن
    if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
    onlineUsers.get(uid).add(socket.id);
    socket.broadcast.emit('presence', { userId: uid, online: true });

    // ---- ورود به روم گفتگو ----
    socket.on('conv:join', async (convId, ack) => {
      const conv = await memberConv(convId, uid);
      if (!conv) return ack?.({ error: 'دسترسی ندارید' });
      socket.join(`conv:${convId}`);
      // وضعیت آنلاین طرف مقابل را برگردان
      const otherId = String(conv.buyer) === uid ? String(conv.seller) : String(conv.buyer);
      ack?.({ ok: true, otherOnline: onlineUsers.has(otherId), otherId });
    });

    socket.on('conv:leave', (convId) => {
      socket.leave(`conv:${convId}`);
    });

    // ---- ارسال پیام ----
    socket.on('msg:send', async ({ convId, text }, ack) => {
      try {
        const body = (text || '').trim();
        if (!body) return ack?.({ error: 'متن پیام خالی است' });
        if (body.length > 2000) return ack?.({ error: 'پیام بیش از حد طولانی است' });

        const conv = await memberConv(convId, uid);
        if (!conv) return ack?.({ error: 'دسترسی ندارید' });

        const msg = await Message.create({ conversation: conv._id, sender: uid, text: body });

        const iAmSeller = String(conv.seller) === uid;
        conv.lastMessage = body.slice(0, 100);
        conv.lastMessageAt = new Date();
        conv.lastSender = uid;
        if (iAmSeller) conv.unreadBuyer += 1;
        else conv.unreadSeller += 1;
        await conv.save();

        const plain = msg.toObject();

        // به همه اعضای روم گفتگو (فرستنده با ack می‌گیرد، گیرنده با رویداد)
        socket.to(`conv:${convId}`).emit('msg:new', { convId, message: plain });

        // نوتیف سراسری برای گیرنده (هدر/لیست گفتگوها حتی وقتی داخل روم نیست)
        const otherId = iAmSeller ? String(conv.buyer) : String(conv.seller);
        io.to(`user:${otherId}`).emit('msg:notify', {
          convId,
          message: plain,
          adId: String(conv.ad),
        });

        ack?.({ ok: true, message: plain });
      } catch (err) {
        ack?.({ error: 'خطا در ارسال پیام' });
      }
    });

    // ---- در حال نوشتن ----
    socket.on('typing', async ({ convId, isTyping }) => {
      // چک سبک عضویت: فقط اگر در روم باشد broadcast کن
      if (socket.rooms.has(`conv:${convId}`)) {
        socket.to(`conv:${convId}`).emit('typing', { convId, userId: uid, isTyping: !!isTyping });
      }
    });

    // ---- خوانده شدن پیام‌ها ----
    socket.on('msgs:read', async ({ convId }) => {
      const conv = await memberConv(convId, uid);
      if (!conv) return;
      await Message.updateMany(
        { conversation: conv._id, sender: { $ne: uid }, read: false },
        { read: true }
      );
      if (String(conv.seller) === uid) conv.unreadSeller = 0;
      else conv.unreadBuyer = 0;
      await conv.save();
      // به فرستنده‌ها اطلاع بده تیک‌ها دوتایی شود
      socket.to(`conv:${convId}`).emit('msgs:read', { convId, readerId: uid });
    });

    // ---- قطع اتصال ----
    socket.on('disconnect', () => {
      const set = onlineUsers.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(uid);
          socket.broadcast.emit('presence', { userId: uid, online: false });
        }
      }
    });
  });

  return io;
}
