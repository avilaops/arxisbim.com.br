import type { FastifyRequest, FastifyReply } from 'fastify';

export type RateLimitMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export interface RateLimiter {
  middleware(): RateLimitMiddleware;
}

export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  middleware(): RateLimitMiddleware {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = (request.headers['cf-connecting-ip'] as string) ?? request.ip ?? 'unknown';
      const now = Date.now();
      const entry = this.store.get(ip);

      if (!entry || now > entry.resetAt) {
        this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
        return;
      }

      entry.count++;
      if (entry.count > this.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        reply.header('Retry-After', retryAfter);
        return reply.status(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
        });
      }
    };
  }
}

// Pre-configured auth rate limiters — auth code imports these, not MemoryRateLimiter directly
function make(max: number, windowMs: number): RateLimitMiddleware {
  return new MemoryRateLimiter(max, windowMs).middleware();
}

export const authRateLimits = {
  login:          make(10, 60_000),
  register:       make(5,  60_000),
  forgotPassword: make(5,  60_000),
  resetPassword:  make(10, 60_000),
  verifyEmail:    make(10, 60_000),
  refresh:        make(20, 60_000),
} as const;
