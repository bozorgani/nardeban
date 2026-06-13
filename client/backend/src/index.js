import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { globalLimiter, otpLimiter, verifyLimiter, writeLimiter } from './middleware/limiters.js';
import { corsOptions } from './config/cors.js';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import authRoutes from './routes/auth.routes.js';
import adRoutes from './routes/ad.routes.js';
import categoryRoutes from './routes/category.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import pushRoutes from './routes/push.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportRoutes from './routes/report.routes.js';
import savedSearchRoutes from './routes/savedSearch.routes.js';
import seoRoutes from './routes/seo.routes.js';
import { startSavedSearchNotifier } from './savedSearchNotifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // پشت Nginx/پروکسی، IP واقعی برای rate-limit

/* ---------- امنیت ---------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // عکس‌ها از دامنه فرانت لود می‌شوند
    contentSecurityPolicy: false, // API است؛ CSP سمت فرانت اعمال می‌شود
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// پاکسازی اپراتورهای مونگو ($ و .) از ورودی‌ها — ضد NoSQL injection
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  // req.query در Express 5 فقط-خواندنی است؛ مقادیر آن به‌صورت رشته استفاده می‌شوند
  next();
});

/* ---------- Rate Limiting ---------- */
app.use('/api/', globalLimiter);
app.use('/api/auth/request-otp', otpLimiter);
app.use('/api/auth/verify-otp', verifyLimiter);
app.use('/api/reports', (req, res, next) =>
  req.method === 'POST' ? writeLimiter(req, res, next) : next()
);

// static serving of uploaded images (با کش طولانی — فایل‌ها immutable اند)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '30d',
    immutable: true,
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'nardeban-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/seo', seoRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'مسیر یافت نشد' }));

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'خطای سرور' });
});

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initSocket(server); // ⚡ چت Real-time

const start = () =>
  server.listen(PORT, () => {
    console.log(`🚀 API + Socket.io on http://localhost:${PORT}`);
    startSavedSearchNotifier();
  });

if (process.env.SKIP_DB_CONNECT === '1') start();
else connectDB().then(start);
