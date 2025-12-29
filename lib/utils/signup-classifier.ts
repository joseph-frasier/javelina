import type { AuthError, User } from '@supabase/supabase-js';

/**
 * Signup outcome types:
 * - new_user: A new user was successfully created (identities array has entries)
 * - existing_email: The email already exists (obfuscated user with empty identities array)
 * - error: An actual error occurred (network, validation, etc.)
 */
export type SignupOutcome = 'new_user' | 'existing_email' | 'error';

/**
 * Classifies the result of a Supabase signUp() call to distinguish between:
 * - Real successful signup (new user with identity created)
 * - Existing email (obfuscated user with no identities)
 * - Actual errors
 * 
 * How Supabase signals "email already exists":
 * 
 * Case A - Email confirmation disabled:
 *   - Supabase returns an explicit error: "User already registered"
 *   - We detect this via error.message
 * 
 * Case B - Email confirmation enabled (default):
 *   - Supabase does NOT return an error (for security - prevents email enumeration)
 *   - Instead returns an "obfuscated" user object
 *   - Key signal: user.identities is an EMPTY array [] (no new identity created)
 *   - For a real new signup: user.identities contains at least one identity
 * 
 * @param user - The user object from signUp response data
 * @param error - The error object from signUp response
 * @returns SignupOutcome indicating the type of result
 */
export function classifySignupResult(
  user: User | null,
  error: AuthError | null
): SignupOutcome {
  // Case 1: Hard error (network, validation, rate limit, etc.)
  if (error) {
    // Check if it's the explicit "user already registered" error
    // (happens when email confirmation is disabled)
    const errorMsg = error.message?.toLowerCase() || '';
    if (
      errorMsg.includes('user already registered') ||
      errorMsg.includes('already exists') ||
      errorMsg.includes('already been registered')
    ) {
      return 'existing_email';
    }
    
    // Any other error
    return 'error';
  }

  // Case 2: No error, but also no user object (shouldn't happen, but handle it)
  if (!user) {
    return 'error';
  }

  // Case 3: Check identities array to distinguish new vs existing user
  // When email confirmation is enabled:
  // - New signup: identities array has at least one identity (e.g., email provider)
  // - Existing email: identities array is empty (obfuscated user)
  const identities = user.identities ?? [];
  
  if (identities.length === 0) {
    // Empty identities = no new identity was created = email already exists
    return 'existing_email';
  }

  // Real successful signup with new identity created
  return 'new_user';
}

