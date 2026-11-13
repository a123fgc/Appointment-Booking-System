import { createHmac } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';
import { createRateLimitMiddleware } from './rateLimitCore.js';
import { trustedClientIp } from './trustedClientIp.js';

function identify(req) {
  // Store a stable pseudonymous key instead of raw client IP addresses.
  return createHmac('sha256', env.JWT_SECRET)
    .update(trustedClientIp(req, env.VERCEL === '1'))
    .digest('hex');
}

const redis = env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '900 s'),
      prefix: 'appointment-auth:login',
      ephemeralCache: false,
      timeout: 2000,
    })
  : null;

const signupLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '3600 s'),
      prefix: 'appointment-auth:signup',
      ephemeralCache: false,
      timeout: 2000,
    })
  : null;

// Development may run without Upstash; production configuration rejects that.
export const loginRateLimit = loginLimiter
  ? createRateLimitMiddleware({ limiter: loginLimiter, category: 'ip', identify })
  : (req, res, next) => next();

export const signupRateLimit = signupLimiter
  ? createRateLimitMiddleware({ limiter: signupLimiter, category: 'ip', identify })
  : (req, res, next) => next();
