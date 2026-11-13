import { isIP } from 'node:net';

export function trustedClientIp(req, isVercel) {
  // Only trust Vercel's platform-overwritten header when the process is hosted
  // on Vercel. Ignore caller-controlled forwarding headers everywhere else.
  if (isVercel) {
    const forwarded = req.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded && isIP(forwarded)) return forwarded;
  }

  return req.socket.remoteAddress || 'unknown';
}
