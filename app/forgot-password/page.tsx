'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/lib/auth-store';
import { Logo } from '@/components/ui/Logo';
import HCaptchaField, { HCaptchaFieldHandle } from '@/components/auth/HCaptchaField';
import { isHCaptchaEnabled } from '@/lib/captcha/config';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptchaFieldHandle>(null);

  const validateEmail = (): boolean => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (isHCaptchaEnabled && !captchaToken) {
      setCaptchaError('Please complete the captcha');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError('');
    setSuccessMessage('');

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(email, captchaToken || undefined);

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(
        'Password reset instructions have been sent to your email address. Please check your inbox and follow the link to reset your password.'
      );
      setEmail('');
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } else {
      // Reset captcha after failed attempt (tokens are single-use)
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      
      const errorMsg = result.error || 'An error occurred. Please try again.';
      
      // Check if it's a captcha-related error
      const isCaptchaError = errorMsg.toLowerCase().includes('captcha');
      
      if (isCaptchaError) {
        // Captcha errors - show as form-level captcha error only
        setCaptchaError('Please complete the captcha to continue.');
      } else {
        // Other errors - show as general error
        setError(errorMsg);
      }
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError('');
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError('Captcha expired. Please try again.');
  };

  const handleCaptchaError = (error: string) => {
    setCaptchaToken(null);
    setCaptchaError('Captcha error. Please try again.');
  };

  return (
    <div className="min-h-screen bg-orange-light flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo/Brand Section */}
        <div className="flex flex-col items-center mb-0">
          <Logo
            width={300}
            height={120}
            priority
          />
        </div>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-light p-8">
          {successMessage ? (
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-orange-dark mb-2">
                Check your email
              </h2>
              <p className="text-gray-slate text-sm">{successMessage}</p>
              <div className="mt-6">
                <Link href="/login">
                  <Button variant="primary" size="lg" className="w-full">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-gray-slate mt-4">
                Didn&rsquo;t receive the email?{' '}
                <button
                  onClick={() => {
                    setSuccessMessage('');
                    setError('');
                  }}
                  className="text-orange hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-orange-dark mb-2">
                  Forgot your password?
                </h2>
                <p className="text-sm text-gray-slate">
                  No worries! Enter your email address and we&rsquo;ll send you
                  instructions to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <Input
                  id="email"
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  error={error}
                  autoComplete="email"
                  required
                />

                {/* hCaptcha */}
                {isHCaptchaEnabled && (
                  <div>
                    <HCaptchaField
                      ref={captchaRef}
                      onVerify={handleCaptchaVerify}
                      onExpire={handleCaptchaExpire}
                      onError={handleCaptchaError}
                    />
                    {captchaError && (
                      <p className="mt-1.5 text-sm font-regular text-red-500 text-center">
                        {captchaError}
                      </p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || (isHCaptchaEnabled && !captchaToken)}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-gray-slate hover:text-orange transition-colors"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Help Text */}
        {!successMessage && (
          <p className="mt-6 text-center text-xs text-gray-slate">
            If you don&rsquo;t receive an email within a few minutes, please
            check your spam folder or contact support.
          </p>
        )}
      </div>
    </div>
  );
}

