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

// Login ke waqt user na milne par bhi bcrypt chalate hain, taake jawab ke waqt se
// pata na chale ke email mojood hai ya nahi
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.n6h0gQh2o8uYq3x1p9yqK5Yx1S6e';

// POST /api/auth/signup: hamesha customer account banta hai
export async function signup(req, res) {
  const { name, email, password } = signupSchema.parse(req.body);

  const passwordHash = await hashPassword(password);

  // Email pehle se ho to unique index (23505) error deta hai, jo errorHandler 409 bana deta hai
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'customer')
     RETURNING id, name, email, role`,
    [name, email, passwordHash]
  );

  const user = rows[0];
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.password_hash, s.id AS staff_id, s.active AS staff_active
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id
      WHERE lower(u.email) = lower($1)`,
    [email]
  );

  const user = rows[0];
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) {
    throw new HttpError(401, 'Email ya password ghalat hai');
  }

  // Band kiya hua staff login nahi kar sakta
  if (user.role === 'staff' && user.staff_active === false) {
    throw new HttpError(403, 'Yeh account band kar diya gaya hai');
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}

// GET /api/auth/me: requireAuth ke baad, page refresh par frontend yahi poochta hai
export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
// POST /api/auth/logout
export function logout(req, res) {
  res.status(200).json({
    message: 'Logout successfully'
  });
}