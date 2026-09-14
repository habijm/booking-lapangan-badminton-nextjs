import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const stores = new Map<string, RateLimitStore>();

function cleanupExpiredStores() {
  const now = Date.now();
  for (const [key, store] of stores.entries()) {
    if (store.resetTime < now) {
      stores.delete(key);
    }
  }
}

setInterval(cleanupExpiredStores, 60000);

export interface RateLimitConfig {
  intervalMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<{ success: boolean; remaining: number; resetTime: number }> => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : getClientIp(req);

    const now = Date.now();
    const store = stores.get(key);

    if (!store || store.resetTime < now) {
      const newStore: RateLimitStore = {
        count: 1,
        resetTime: now + config.intervalMs,
      };
      stores.set(key, newStore);
      return {
        success: true,
        remaining: config.maxRequests - 1,
        resetTime: newStore.resetTime,
      };
    }

    if (store.count >= config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: store.resetTime,
      };
    }

    store.count++;
    return {
      success: true,
      remaining: config.maxRequests - store.count,
      resetTime: store.resetTime,
    };
  };
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function rateLimitResponse(resetTime: number): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(resetTime),
      },
    }
  );
}

export const paymentRateLimit = createRateLimiter({
  intervalMs: 60 * 1000,
  maxRequests: 10,
});

export const notifyRateLimit = createRateLimiter({
  intervalMs: 60 * 1000,
  maxRequests: 30,
});

export const bookingLookupRateLimit = createRateLimiter({
  intervalMs: 60 * 1000,
  maxRequests: 20,
});

export const generalApiRateLimit = createRateLimiter({
  intervalMs: 60 * 1000,
  maxRequests: 60,
});
