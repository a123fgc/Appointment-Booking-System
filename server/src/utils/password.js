import bcrypt from 'bcryptjs';

const ROUNDS = 10;

// Password ko hash banata hai (database mein sirf yahi hash save hota hai)
export function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

// Login par: diya gaya password hash se milta hai ya nahi
export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Kam az kam 8 characters, aur ek harf aur ek number
export function isStrongPassword(plain) {
  return (
    typeof plain === 'string' &&
    plain.length >= 8 &&
    plain.length <= 72 &&
    /[A-Za-z]/.test(plain) &&
    /\d/.test(plain)
  );
}

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters long and contain both letters and numbers';