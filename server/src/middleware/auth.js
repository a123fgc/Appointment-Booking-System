import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';

// Login/signup ke baad token banane ke liye (auth controller yahi use karega)
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function getTokenFromHeader(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// Protected routes ke liye: token check karta hai aur req.user set karta hai
export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Pehle login karein' });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session khatam ho gaya, dobara login karein' });
    }

    // Database se taaza user lein, taake delete hua user ya badla hua role foran nazar aaye
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, s.id AS staff_id
         FROM users u
         LEFT JOIN staff s ON s.user_id = u.id
        WHERE u.id = $1`,
      [payload.sub]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Account mojood nahi' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      staffId: user.staff_id || null, // sirf staff users ke liye
    };
    next();
  } catch (err) {
    next(err);
  }
}