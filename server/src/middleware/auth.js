
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';

// Login/signup ke baad token banane ke liye
// Har token ke andar unique session ID (sid) hogi.
export function signToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      sid: sessionId,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

function getTokenFromHeader(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// Protected routes ke liye authentication aur active session check
export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ error: 'Please log in first' });
    }

    let payload;

    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        error: 'Session has expired, please log in again',
      });
    }

    // Purane tokens mein sid nahi hogi.
    if (!payload.sid) {
      return res.status(401).json({
        error: 'Invalid session, please log in again',
      });
    }

    // User aur uska active session dono database se verify karein.
    const { rows } = await query(
      `SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          s.id AS staff_id,
          s.active AS staff_active
       FROM public.users u
       INNER JOIN public.user_sessions us
          ON us.user_id = u.id
       LEFT JOIN public.staff s
          ON s.user_id = u.id
       WHERE u.id = $1
         AND us.session_id = $2
         AND us.revoked_at IS NULL`,
      [payload.sub, payload.sid]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        error: 'Invalid session, please log in again',
      });
    }

    // Staff deactivation applies to already-issued tokens as well as new logins.
    if (user.role === 'staff' && (!user.staff_id || user.staff_active !== true)) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      staffId: user.staff_id || null,
    };

    // Logout controller isi ID ko use karega.
    req.authSessionId = payload.sid;

    next();
  } catch (err) {
    next(err);
  }
}
