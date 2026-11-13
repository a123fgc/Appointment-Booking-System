  import 'dotenv/config';
  import { z } from 'zod';

  // Khali string ("SMTP_HOST=") ko undefined samjho
  const optional = (schema) =>
    z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

  const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be 16 characters or longer').default('change-me-please-change-this-secret'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    UPSTASH_REDIS_REST_URL: optional(z.string().url()),
    UPSTASH_REDIS_REST_TOKEN: optional(z.string().min(1)),
    VERCEL: optional(z.enum(['0', '1'])),

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
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`.env file has errors:\n${details}`);
  }

  const e = parsed.data;

  const hasRateLimitUrl = Boolean(e.UPSTASH_REDIS_REST_URL);
  const hasRateLimitToken = Boolean(e.UPSTASH_REDIS_REST_TOKEN);
  if (hasRateLimitUrl !== hasRateLimitToken) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.');
  }
  if (e.NODE_ENV === 'production' && !hasRateLimitUrl) {
    throw new Error('Production environment requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for rate limiting.');
  }

  // Production mein example wala secret use hona khatarnak hai
  if (e.NODE_ENV === 'production' && e.JWT_SECRET.startsWith('change-me')) {
    throw new Error('Production environment requires a secure JWT_SECRET.');
  }

  // Baqi code mein sirf yahi object use karein, process.env seedha nahi
  export const env = {
    ...e,
    SUPABASE_SERVICE_ROLE_KEY: e.SUPABASE_SECRET_KEY,
    isProd: e.NODE_ENV === 'production',
    // Email tabhi bheji jaye gi jab SMTP poora set ho
    smtpEnabled: Boolean(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS),
  };
