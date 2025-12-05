import Stripe from 'stripe';

/**
 * Central Stripe client for server-side operations.
 * 
 * Last updated: 2025-12-05 - Reverted to test mode
 * 
 * IMPORTANT: We intentionally pin the runtime API version to '2024-06-20' for stable billing behavior.
 * This version has been validated to properly expand PaymentIntent objects during subscription creation,
 * which is critical for our checkout flow.
 * 
 * The installed Stripe SDK's TypeScript types may expect a newer literal version (e.g. "2025-09-30.clover"),
 * causing type errors when we specify the older version. To work around this without changing runtime behavior,
 * we cast the apiVersion to 'any'. This is intentional and safe, as Stripe supports versioning at runtime.
 * 
 * Future upgrade path:
 * - When upgrading the Stripe SDK, test subscription creation thoroughly
 * - Verify that PaymentIntent expansion works correctly with the new API version
 * - Once validated, update STRIPE_API_VERSION and remove the type cast if possible
 */

export const STRIPE_API_VERSION = '2024-06-20' as const;

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY environment variable is not set. Billing features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Type guard bypass to satisfy TypeScript literal union check
      // while preserving the correct runtime API version
      apiVersion: STRIPE_API_VERSION as any,
    })
  : null;

// Sanity check: validate version string format in non-production environments
if (process.env.NODE_ENV !== 'production') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(STRIPE_API_VERSION)) {
    throw new Error(`Invalid STRIPE_API_VERSION format: ${STRIPE_API_VERSION}. Expected format: YYYY-MM-DD`);
  }
  console.log(`✅ Stripe client initialized with API version: ${STRIPE_API_VERSION}`);
}

