import 'dotenv/config';
import { z } from 'zod';

// Khali string ("SMTP_HOST=") ko undefined samjho
const optional = (schema) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL zaroori hai'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET kam az kam 16 characters ka ho'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  SMTP_HOST: optional(z.string()),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optional(z.string()),
  SMTP_PASS: optional(z.string()),
  MAIL_FROM: z.string().default('Booking App <no-reply@example.com>'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(2),

  BUSINESS_TZ: z.string().default('Asia/Karachi'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('.env mein masla hai:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const e = parsed.data;

// Production mein example wala secret use hona khatarnak hai
if (e.NODE_ENV === 'production' && e.JWT_SECRET.startsWith('change-me')) {
  console.error('Production mein JWT_SECRET badalna zaroori hai.');
  process.exit(1);
}

// Baqi code mein sirf yahi object use karein, process.env seedha nahi
export const env = {
  ...e,
  isProd: e.NODE_ENV === 'production',
  // Email tabhi bheji jaye gi jab SMTP poora set ho
  smtpEnabled: Boolean(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS),
};