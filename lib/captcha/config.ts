/**
 * hCaptcha configuration
 * 
 * Reads hCaptcha site key and Supabase enforcement status.
 * isHCaptchaEnabled reflects whether Supabase Auth will enforce captcha verification.
 */

// Supabase Auth captcha enforcement status (must match Supabase dashboard setting)
const captchaEnabled = process.env.NEXT_PUBLIC_SUPABASE_CAPTCHA_ENABLED === 'true';

// Determine if we're in production
const isProd =
  process.env.VERCEL_ENV === 'production' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  process.env.NODE_ENV === 'production';

// Choose the correct site key based on environment
export const HCAPTCHA_SITE_KEY = isProd
  ? process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY_PROD ?? ''
  : process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY_DEV ?? '';

/**
 * Returns true if Supabase Auth captcha enforcement is enabled.
 * Requires both the site key AND enforcement flag to be set.
 */
export const isHCaptchaEnabled = captchaEnabled && !!HCAPTCHA_SITE_KEY;

// Debug logging (remove after testing)
if (typeof window !== 'undefined') {
  console.log('[hCaptcha Debug] captchaEnabled:', captchaEnabled);
  console.log('[hCaptcha Debug] isProd:', isProd);
  console.log('[hCaptcha Debug] HCAPTCHA_SITE_KEY:', HCAPTCHA_SITE_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('[hCaptcha Debug] isHCaptchaEnabled:', isHCaptchaEnabled);
  console.log('[hCaptcha Debug] NODE_ENV:', process.env.NODE_ENV);
  console.log('[hCaptcha Debug] VERCEL_ENV:', process.env.VERCEL_ENV);
}

// Dev-time warning for misconfiguration
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (captchaEnabled && !HCAPTCHA_SITE_KEY) {
    console.error(
      '⚠️ CAPTCHA MISCONFIGURATION: Supabase enforcement is enabled but site key is missing.\n' +
      'Set NEXT_PUBLIC_HCAPTCHA_SITE_KEY_DEV or disable NEXT_PUBLIC_SUPABASE_CAPTCHA_ENABLED.\n' +
      'All auth flows will fail until this is fixed.'
    );
  }
}
