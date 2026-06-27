/**
 * 🪜 بفروش — سرور بک‌اند مستقل (Express + Socket.io)
 *
 * نقطه‌ی ورود بک‌اند (استقرار روی سرور Ubuntu — با Docker یا مستقیم Node/PM2).
 * - /api/*    → Express API (auth, ads, categories, chat, ...)
 * - /uploads  → فایل‌های آپلودشده (با کش طولانی)
 * - Socket.io → چت Real-time روی همان پورت
 *
 * اجرای محلی:
 *   npm run dev          → نیاز به MongoDB (MONGO_URI در .env)
 *   npm run dev:memory   → MongoDB درون‌حافظه‌ای + seed (بدون نصب MongoDB)
 *
 * اجرای پروداکشن:
 *   npm start            → node src/index.js  (پشت nginx)
 */
import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { startSavedSearchNotifier } from './savedSearchNotifier.js';

const app = createApp();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initSocket(server); // ⚡ چت Real-time

const start = () =>
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 بفروش API + Socket.io روی http://0.0.0.0:${PORT}`);
    startSavedSearchNotifier();
  });

// در حالت dev:memory، اتصال DB قبلاً برقرار شده و SKIP_DB_CONNECT=1 است
if (process.env.SKIP_DB_CONNECT === '1') start();
else connectDB().then(start);
