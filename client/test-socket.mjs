// تست end-to-end چت Real-time با دو کلاینت Socket.io واقعی
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const j = (r) => r.json();

async function login(phone) {
  const { demoCode } = await fetch(`${API}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  }).then(j);
  const { token } = await fetch(`${API}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code: demoCode }),
  }).then(j);
  return token;
}

const results = [];
const check = (name, cond) => {
  results.push([name, !!cond]);
  console.log(`${cond ? '✅' : '❌'} ${name}`);
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = io(API, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(e));
    setTimeout(() => reject(new Error('timeout')), 5000);
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (sock, event, timeout = 4000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeout);
    sock.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });

/* ================= تست‌ها ================= */

// ۰) اتصال بدون توکن باید رد شود
try {
  await connect('invalid-token');
  check('اتصال با توکن نامعتبر رد می‌شود', false);
} catch {
  check('اتصال با توکن نامعتبر رد می‌شود', true);
}

const sellerToken = await login('09120000000'); // صاحب آگهی‌های seed
const buyerToken = await login('09353333333');

// گرفتن آگهی پراید و ساخت گفتگو
const { ads } = await fetch(`${API}/api/ads?q=${encodeURIComponent('پراید')}`).then(j);
const adId = ads[0]._id;
const { conversationId } = await fetch(`${API}/api/chat/conversations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
  body: JSON.stringify({ adId }),
}).then(j);

// ۱) اتصال دو کلاینت
const seller = await connect(sellerToken);
const buyer = await connect(buyerToken);
check('هر دو کلاینت متصل شدند', seller.connected && buyer.connected);

// ۲) join — خریدار باید آنلاین بودن فروشنده را ببیند
const joinBuyer = await new Promise((r) => buyer.emit('conv:join', conversationId, r));
await new Promise((r) => seller.emit('conv:join', conversationId, r));
check('join موفق + presence فروشنده آنلاین', joinBuyer.ok && joinBuyer.otherOnline === true);

// ۳) خریدار تایپ می‌کند → فروشنده typing می‌گیرد
const typingP = once(seller, 'typing');
buyer.emit('typing', { convId: conversationId, isTyping: true });
const typing = await typingP;
check('نشانگر «در حال نوشتن» لحظه‌ای می‌رسد', typing.isTyping === true && typing.convId === conversationId);

// ۴) خریدار پیام می‌فرستد → فروشنده فوراً msg:new می‌گیرد
const msgP = once(seller, 'msg:new');
const sendAck = await new Promise((r) =>
  buyer.emit('msg:send', { convId: conversationId, text: 'سلام! هنوز موجوده؟' }, r)
);
const received = await msgP;
check('ارسال ack موفق', sendAck.ok === true);
check('پیام لحظه‌ای به فروشنده رسید', received.message?.text === 'سلام! هنوز موجوده؟');

// ۵) فروشنده می‌خواند → خریدار msgs:read می‌گیرد (تیک ✓✓)
const readP = once(buyer, 'msgs:read');
seller.emit('msgs:read', { convId: conversationId });
const readEv = await readP;
check('رویداد خوانده‌شدن (✓✓) به فرستنده رسید', readEv.convId === conversationId);

// ۶) پیام خارج از روم → msg:notify سراسری
seller.emit('conv:leave', conversationId);
await wait(150);
const notifyP = once(seller, 'msg:notify');
await new Promise((r) =>
  buyer.emit('msg:send', { convId: conversationId, text: 'قیمت آخر چنده؟' }, r)
);
const notify = await notifyP;
check('نوتیف سراسری وقتی خارج از گفتگو است', notify.convId === conversationId);

// ۷) امنیت: کاربر سوم نمی‌تواند join یا پیام بفرستد
const stranger = await connect(await login('09354444444'));
const strangerJoin = await new Promise((r) => stranger.emit('conv:join', conversationId, r));
const strangerSend = await new Promise((r) =>
  stranger.emit('msg:send', { convId: conversationId, text: 'هک!' }, r)
);
check('غریبه join نمی‌تواند', !!strangerJoin.error);
check('غریبه پیام نمی‌تواند بفرستد', !!strangerSend.error);

// ۸) قطع اتصال → presence آفلاین
const offlineP = once(seller, 'presence', 5000);
buyer.disconnect();
const offline = await offlineP;
check('presence آفلاین بعد از قطع اتصال', offline.online === false);

// ۹) شمارنده نخوانده بعد از همه اینها درست است؟
const { total } = await fetch(`${API}/api/chat/unread-count`, {
  headers: { Authorization: `Bearer ${sellerToken}` },
}).then(j);
check('شمارنده نخوانده فروشنده = ۱ (فقط پیام دوم)', total === 1);

/* ================= نتیجه ================= */
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? '🎉 همهٔ' : '⚠️'} ${results.length - failed.length}/${results.length} تست پاس شد`);
seller.disconnect();
stranger.disconnect();
process.exit(failed.length ? 1 : 0);
