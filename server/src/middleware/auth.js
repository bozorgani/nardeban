import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'ابتدا وارد شوید' });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'کاربر یافت نشد' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'توکن نامعتبر است' });
  }
}

// احراز هویت اختیاری (برای صفحاتی که لاگین لازم نیست)
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.user = await User.findById(payload.id);
    }
  } catch {
    /* ignore */
  }
  next();
}
