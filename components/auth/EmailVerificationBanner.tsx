'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { authApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

/**
 * EmailVerificationBanner
 * 
 * Shows a prominent banner for unverified users, allowing them to resend
 * the verification email. Appears at the top of key pages until email is verified.
 * 
 * Usage:
 *   {user && !user.email_verified && (
 *     <EmailVerificationBanner email={user.email} />
 *   )}
 */
export function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { addToast } = useToastStore();
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const startCooldown = (seconds: number) => {
    // Clear any existing interval
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    setCooldownSeconds(seconds);
    cooldownIntervalRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    // Rate limiting check
    if (cooldownSeconds > 0) {
      addToast('warning', `Please wait ${cooldownSeconds} seconds before requesting another email.`);
      return;
    }

    setIsResending(true);
    try {
      await authApi.resendVerification();
      addToast('success', 'Verification email sent! Check your inbox.');
      
      // Start 60-second cooldown
      startCooldown(60);
    } catch (error: any) {
      const message = error.message || 'Failed to send verification email';
      addToast('error', message);
      
      // If it's a rate limit error from backend, show longer cooldown
      if (error.statusCode === 429) {
        startCooldown(180); // 3 minute cooldown for rate limit errors
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <div 
      className="bg-orange/10 dark:bg-orange/10 border-l-4 border-orange p-4 mb-6 rounded-r-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg 
            className="w-5 h-5 text-orange" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-orange-dark dark:text-orange mb-1">
            Email Verification Required
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Please verify <span className="font-medium">{email}</span> to create or modify resources. 
            Check your inbox for a verification link.
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
            Don&apos;t see the email? Check your spam or junk folder.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={isResending || cooldownSeconds > 0}
              className="text-xs"
              aria-label="Resend verification email"
            >
              {isResending 
                ? 'Sending...' 
                : cooldownSeconds > 0 
                  ? `Wait ${cooldownSeconds}s`
                  : 'Resend Email'}
            </Button>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline"
                aria-label="Dismiss banner"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Close button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange rounded"
            aria-label="Close banner"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
