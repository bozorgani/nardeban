import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import User from './models/User.js';
import Ad from './models/Ad.js';
import { sendPushToUser } from './push.js';
import { isAllowedOrigin } from './config/cors.js';
import { JWT_SECRET } from './config/env.js';
import { incUnreadForRecipient, resetUnreadForReader } from './services/conversation.js';
import { TOKEN_COOKIE } from './utils/token.js';

// استخراج توکن از کوکی handshake سوکت (SEC-04)
function getTokenFromHandshake(socket) {
  const raw = socket.handshake.headers?.cookie || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === TOKEN_COOKIE) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

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

// دسترسی سراسری به io و وضعیت آنلاین (برای روت‌های REST مثل آپلود عکس چت)
export let ioInstance = null;
export const isUserOnline = (userId) => onlineUsers.has(String(userId));

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, cb) {
        cb(null, isAllowedOrigin(origin));
      },
      credentials: true,
    },
  });

  // ---- احراز هویت هر اتصال با JWT ----
  io.use(async (socket, next) => {
    try {
      // اولویت: کوکی HttpOnly از handshake (SEC-04) — fallback به auth.token برای سازگاری
      const token =
        getTokenFromHandshake(socket) || socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, JWT_SECRET);
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
        // به‌روزرسانی اتمیک نخوانده + آخرین پیام (BE-02)
        await incUnreadForRecipient(conv._id, iAmSeller, {
          lastMessage: body.slice(0, 100),
          lastMessageAt: new Date(),
          lastSender: uid,
        });

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

        // 📲 اگر گیرنده هیچ اتصال سوکت بازی ندارد (آفلاین/تب بسته) → Web Push
        if (!onlineUsers.has(otherId)) {
          const [sender, ad] = await Promise.all([
            User.findById(uid).select('name').lean(),
            Ad.findById(conv.ad).select('title').lean(),
          ]);
          sendPushToUser(otherId, {
            title: `پیام جدید از ${sender?.name || 'کاربر نردبان'}`,
            body: body.length > 80 ? body.slice(0, 80) + '…' : body,
            tag: `conv-${convId}`, // پیام‌های یک گفتگو روی هم جایگزین شوند
            url: `/chat?c=${convId}`,
            adTitle: ad?.title || '',
          }).catch(() => {});
        }

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
      // ریست اتمیک شمارندهٔ نخواندهٔ خوانندهٔ فعلی (BE-02)
      await resetUnreadForReader(conv._id, String(conv.seller) === uid);
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

  ioInstance = io;
  return io;
}
