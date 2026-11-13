export function createRateLimitMiddleware({ limiter, category, identify }) {
  return async function rateLimit(req, res, next) {
    try {
      const result = await limiter.limit(`${category}:${identify(req)}`);

      if (result.reason === 'timeout') {
        return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
      }

      if (!result.success) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' });
      }

      return next();
    } catch {
      console.error('Authentication rate-limit service unavailable');
      return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
    }
  };
}
