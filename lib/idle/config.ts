/**
 * Idle logout configuration
 * Defaults to 60 minutes idle timeout with 58 minute warning
 * Admin panel uses 1 minute for testing (change back to 15 for production)
 */

const DEFAULT_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const DEFAULT_WARNING_MS = 58 * 60 * 1000; // 58 minutes
const DEFAULT_ADMIN_IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute (TESTING - change back to 15 for production)

/**
 * Parse integer from env with fallback
 */
function parseEnvInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const IDLE_CONFIG = {
  IDLE_TIMEOUT_MS: parseEnvInt(
    process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS,
    DEFAULT_IDLE_TIMEOUT_MS
  ),
  WARNING_MS: parseEnvInt(
    process.env.NEXT_PUBLIC_IDLE_WARNING_MS,
    DEFAULT_WARNING_MS
  ),
  ADMIN_IDLE_TIMEOUT_MS: parseEnvInt(
    process.env.NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MS,
    DEFAULT_ADMIN_IDLE_TIMEOUT_MS
  ),
} as const;

// Ensure warning comes before timeout
if (IDLE_CONFIG.WARNING_MS >= IDLE_CONFIG.IDLE_TIMEOUT_MS) {
  console.warn(
    '[Idle Config] WARNING_MS should be less than IDLE_TIMEOUT_MS. Using defaults.'
  );
}
