interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Reset or new entry
    rateLimitMap.set(identifier, {
      attempts: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: RATE_LIMIT_ATTEMPTS - 1 };
  }

  if (entry.attempts >= RATE_LIMIT_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.attempts++;
  return { allowed: true, remaining: RATE_LIMIT_ATTEMPTS - entry.attempts };
}

export function getRateLimitReset(identifier: string): number | null {
  const entry = rateLimitMap.get(identifier);
  if (!entry) return null;
  return Math.ceil((entry.resetAt - Date.now()) / 1000);
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 60 * 1000);
