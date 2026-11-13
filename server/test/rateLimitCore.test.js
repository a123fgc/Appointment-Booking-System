import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimitMiddleware } from '../src/middleware/rateLimitCore.js';
import { trustedClientIp } from '../src/middleware/trustedClientIp.js';

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('allows requests within the configured limit', async () => {
  let nextCalls = 0;
  const middleware = createRateLimitMiddleware({
    limiter: { limit: async () => ({ success: true }) },
    category: 'login',
    identify: () => 'client-key',
  });

  await middleware({}, mockResponse(), () => nextCalls++);
  assert.equal(nextCalls, 1);
});

test('returns 429 and Retry-After when the limit is exceeded', async () => {
  const middleware = createRateLimitMiddleware({
    limiter: { limit: async () => ({ success: false, reset: Date.now() + 5000 }) },
    category: 'signup',
    identify: () => 'client-key',
  });
  const res = mockResponse();
  let nextCalls = 0;

  await middleware({}, res, () => nextCalls++);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '5');
  assert.equal(nextCalls, 0);
});

test('fails closed when shared rate-limit storage times out or errors', async (t) => {
  for (const [label, result] of [
    ['timeout', { success: true, reason: 'timeout' }],
    ['storage error', new Error('storage unavailable')],
  ]) {
    await t.test(label, async () => {
      const middleware = createRateLimitMiddleware({
        limiter: {
          limit: async () => {
            if (result instanceof Error) throw result;
            return result;
          },
        },
        category: 'login',
        identify: () => 'client-key',
      });
      const res = mockResponse();

      await middleware({}, res, () => assert.fail('next must not run'));
      assert.equal(res.statusCode, 503);
    });
  }
});

test('uses the Vercel client-IP header only on Vercel and validates it', () => {
  const req = {
    get: (name) => ({
      'x-vercel-forwarded-for': '203.0.113.9',
      'x-forwarded-for': '198.51.100.99',
    })[name],
    socket: { remoteAddress: '127.0.0.1' },
  };

  assert.equal(trustedClientIp(req, true), '203.0.113.9');
  assert.equal(trustedClientIp(req, false), '127.0.0.1');
  assert.equal(
    trustedClientIp({ ...req, get: () => 'not-an-ip' }, true),
    '127.0.0.1'
  );
});
