import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// static serving of uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'nardeban-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

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
  server.listen(PORT, () => console.log(`🚀 API + Socket.io on http://localhost:${PORT}`));

if (process.env.SKIP_DB_CONNECT === '1') start();
else connectDB().then(start);
