/**
 * hCaptcha configuration
 * 
 * Reads the public hCaptcha site key from environment variables.
 * Uses _DEV suffix for the site key variable.
 * If the site key is not set, captcha will be disabled (useful for local dev).
 */

export const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY_DEV || '';

/**
 * Returns true if hCaptcha is enabled (site key is present)
 */
export const isHCaptchaEnabled = !!HCAPTCHA_SITE_KEY;
