'use client';

import { useState, FormEvent } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Button from '@/components/ui/Button';

interface StripePaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  orgId?: string; // Optional org_id to include in return URL
  flow?: 'payment_intent' | 'setup_intent'; // Type of confirmation to perform
}

export function StripePaymentForm({
  onSuccess,
  onError,
  orgId,
  flow = 'payment_intent',
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Validate element inputs before submission
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || 'Validation failed');
        setIsProcessing(false);
        return;
      }

      // Build return URL with org_id if available
      const returnUrl = orgId 
        ? `${window.location.origin}/stripe/success?org_id=${orgId}`
        : `${window.location.origin}/stripe/success`;

      // Use appropriate confirmation method based on flow type
      const { error } = flow === 'payment_intent'
        ? await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: returnUrl,
            },
          })
        : await stripe.confirmSetup({
            elements,
            confirmParams: {
              return_url: returnUrl,
            },
          });

      if (error) {
        // This point will only be reached if there's an immediate error when
        // confirming. Otherwise, the customer will be redirected
        onError(error.message || `${flow === 'payment_intent' ? 'Payment' : 'Setup'} failed`);
        setIsProcessing(false);
      } else {
        // Succeeded, user will be redirected
        onSuccess();
      }
    } catch (err: any) {
      onError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element */}
      <div>
        <PaymentElement />
      </div>

      {/* Security Notice */}
      <div className="flex items-start space-x-2 p-4 bg-orange-light rounded-lg border border-orange/20">
        <svg
          className="w-5 h-5 text-orange flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div className="text-sm text-gray-slate font-regular">
          Your payment information is secure and encrypted by Stripe. We never
          store your card details.
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </div>
        ) : (
          'Complete Payment'
        )}
      </Button>
    </form>
  );
}

