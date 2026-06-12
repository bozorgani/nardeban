// تست real-time ارسال عکس: فروشنده با سوکت گوش می‌دهد، خریدار از REST عکس می‌فرستد
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const j = (r) => r.json();

async function login(phone) {
  const { demoCode } = await fetch(`${API}/api/auth/request-otp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  }).then(j);
  const { token } = await fetch(`${API}/api/auth/verify-otp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code: demoCode }),
  }).then(j);
  return token;
}

const sellerToken = await login('09120000000');
const buyerToken = await login('09353333333');

const { conversations } = await fetch(`${API}/api/chat/conversations`, {
  headers: { Authorization: `Bearer ${buyerToken}` },
}).then(j);
const convId = conversations[0]._id;

// فروشنده به سوکت وصل و join می‌شود
const seller = io(API, { auth: { token: sellerToken }, transports: ['websocket'] });
await new Promise((res, rej) => {
  seller.on('connect', res);
  seller.on('connect_error', rej);
  setTimeout(() => rej(new Error('connect timeout')), 5000);
});
await new Promise((res) => seller.emit('conv:join', convId, res));

const received = new Promise((res, rej) => {
  seller.on('msg:new', (data) => res(data));
  setTimeout(() => rej(new Error('msg:new نرسید')), 6000);
});

// خریدار عکس را از REST می‌فرستد
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fd = new FormData();
fd.append('image', new Blob([png], { type: 'image/png' }), 'pic.png');
fd.set('text', 'تست real-time عکس');
const sent = await fetch(`${API}/api/chat/conversations/${convId}/images`, {
  method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: fd,
}).then(j);

const got = await received;
const ok =
  got.convId === convId &&
  got.message.image &&
  got.message.image === sent.message.image &&
  got.message.text === 'تست real-time عکس';

console.log(ok ? '✅ عکس لحظه‌ای از سوکت به گیرنده رسید:' : '❌ خطا:', got.message.image, '|', got.message.text);
seller.disconnect();
process.exit(ok ? 0 : 1);
