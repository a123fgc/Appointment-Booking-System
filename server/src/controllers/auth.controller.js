
import { randomUUID } from 'node:crypto';
import { query } from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signupSchema, loginSchema } from '../validators/schemas.js';

// Frontend ko jo user object jata hai (password_hash kabhi nahi)
function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    staffId: u.staff_id ?? u.staffId ?? null,
  };
}

// Login ke waqt user na milne par bhi bcrypt chalate hain.
const DUMMY_HASH =
  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.n6h0gQh2o8uYq3x1p9yqK5Yx1S6e';

// POST /api/auth/signup
export async function signup(req, res) {
  const { name, email, password } = signupSchema.parse(req.body);

  const passwordHash = await hashPassword(password);

  try {
    await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')`,
      [name, email, passwordHash]
    );
  } catch (error) {
    if (error.code !== '23505' || error.constraint !== 'users_email_unique') {
      throw error;
    }
  }

  // Keep both newly-created and already-registered addresses indistinguishable.
  // Sign-in is a separate step so duplicate signup cannot disclose account state.
  res.status(202).json({
    message: 'Request received. You can continue by signing in if you used the correct email.',
  });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const { rows } = await query(
    `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.password_hash,
        s.id AS staff_id,
        s.active AS staff_active
     FROM users u
     LEFT JOIN staff s ON s.user_id = u.id
     WHERE lower(u.email) = lower($1)`,
    [email]
  );

  const user = rows[0];

  const ok = await verifyPassword(
    password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !ok) {
    throw new HttpError(401, 'Wrong Email and Password');
  }

  // Band kiya hua staff login nahi kar sakta.
  if (user.role === 'staff' && user.staff_active === false) {
    throw new HttpError(401, 'Wrong Email and Password');
  }

  // Har successful login par new session.
  const sessionId = randomUUID();

  await query(
    `INSERT INTO public.user_sessions (session_id, user_id)
     VALUES ($1, $2)`,
    [sessionId, user.id]
  );

  res.json({
    token: signToken(user, sessionId),
    user: publicUser(user),
  });
}

// GET /api/auth/me
export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

// POST /api/auth/logout
export async function logout(req, res) {
  await query(
    `UPDATE public.user_sessions
     SET revoked_at = NOW()
     WHERE session_id = $1
       AND user_id = $2
       AND revoked_at IS NULL`,
    [req.authSessionId, req.user.id]
  );

  res.status(200).json({
    message: 'Logout successfully',
  });
}
