'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { HCAPTCHA_SITE_KEY } from '@/lib/captcha/config';

interface HCaptchaFieldProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
}

export interface HCaptchaFieldHandle {
  resetCaptcha: () => void;
}

/**
 * HCaptcha checkbox widget component
 * 
 * Renders a visible hCaptcha checkbox that users must complete.
 * Emits callbacks for verify, expire, and error events.
 */
const HCaptchaField = forwardRef<HCaptchaFieldHandle, HCaptchaFieldProps>(({
  onVerify,
  onExpire,
  onError,
}, ref) => {
  const captchaRef = useRef<HCaptcha>(null);

  // Expose reset method to parent component
  useImperativeHandle(ref, () => ({
    resetCaptcha: () => {
      captchaRef.current?.resetCaptcha();
    },
  }));

  const handleVerify = (token: string) => {
    onVerify(token);
  };

  const handleExpire = () => {
    if (onExpire) {
      onExpire();
    }
  };

  const handleError = (err: string) => {
    if (onError) {
      onError(err);
    }
  };

  if (!HCAPTCHA_SITE_KEY) {
    return null; // Don't render if captcha is disabled
  }

  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={captchaRef}
        sitekey={HCAPTCHA_SITE_KEY}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onError={handleError}
      />
    </div>
  );
});

HCaptchaField.displayName = 'HCaptchaField';

export default HCaptchaField;
