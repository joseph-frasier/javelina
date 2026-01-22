/**
 * hCaptcha configuration
 * 
 * Reads hCaptcha site key and Supabase enforcement status.
 * isHCaptchaEnabled reflects whether Supabase Auth will enforce captcha verification.
 */

export const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY_DEV || '';

// Supabase Auth captcha enforcement status (must match Supabase dashboard setting)
const SUPABASE_CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_CAPTCHA_ENABLED === 'true';

/**
 * Returns true if Supabase Auth captcha enforcement is enabled.
 * Requires both the site key AND enforcement flag to be set.
 */
export const isHCaptchaEnabled = SUPABASE_CAPTCHA_ENABLED && !!HCAPTCHA_SITE_KEY;

// Dev-time warning for misconfiguration
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (SUPABASE_CAPTCHA_ENABLED && !HCAPTCHA_SITE_KEY) {
    console.error(
      '⚠️ CAPTCHA MISCONFIGURATION: Supabase enforcement is enabled but site key is missing.\n' +
      'Set NEXT_PUBLIC_HCAPTCHA_SITE_KEY_DEV or disable NEXT_PUBLIC_SUPABASE_CAPTCHA_ENABLED.\n' +
      'All auth flows will fail until this is fixed.'
    );
  }
}
