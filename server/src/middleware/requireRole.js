// Use: router.get('/', requireAuth, requireRole('admin'), handler)
// Ek se zyada role bhi de sakte hain: requireRole('admin', 'staff')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in first' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You are not authorized to perform this action' });
    }

    next();
  };
}