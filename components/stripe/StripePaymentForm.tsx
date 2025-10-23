'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface StripePaymentFormProps {
  onSubmit: (paymentDetails: PaymentDetails) => Promise<void>;
  isProcessing: boolean;
}

interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvc: string;
  name: string;
  email: string;
  country: string;
  zipCode: string;
}

export function StripePaymentForm({
  onSubmit,
  isProcessing,
}: StripePaymentFormProps) {
  const [formData, setFormData] = useState<PaymentDetails>({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
    email: '',
    country: 'US',
    zipCode: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PaymentDetails, string>>>({});

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleChange = (field: keyof PaymentDetails, value: string) => {
    let processedValue = value;

    if (field === 'cardNumber') {
      processedValue = formatCardNumber(value);
    } else if (field === 'expiry') {
      processedValue = formatExpiry(value);
    } else if (field === 'cvc') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentDetails, string>> = {};

    // Card number validation (mock - just check length)
    const cardDigits = formData.cardNumber.replace(/\s/g, '');
    if (!cardDigits) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardDigits.length < 13 || cardDigits.length > 16) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Expiry validation
    if (!formData.expiry) {
      newErrors.expiry = 'Expiry date is required';
    } else if (formData.expiry.length < 5) {
      newErrors.expiry = 'Invalid expiry date';
    }

    // CVC validation
    if (!formData.cvc) {
      newErrors.cvc = 'CVC is required';
    } else if (formData.cvc.length < 3) {
      newErrors.cvc = 'Invalid CVC';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Zip code validation
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card Information Section */}
      <div>
        <h3 className="text-lg font-bold text-orange-dark mb-4">
          Card Information
        </h3>

        <div className="space-y-4">
          {/* Card Number */}
          <div>
            <label
              htmlFor="cardNumber"
              className="block text-sm font-medium text-orange-dark mb-2"
            >
              Card Number
            </label>
            <div className="relative">
              <input
                id="cardNumber"
                type="text"
                placeholder="1234 1234 1234 1234"
                value={formData.cardNumber}
                onChange={(e) => handleChange('cardNumber', e.target.value)}
                className={clsx(
                  'w-full px-4 py-3 rounded-md border transition-colors',
                  'font-regular text-orange-dark placeholder:text-gray-slate/50',
                  'focus:outline-none focus:ring-2 focus:ring-offset-1',
                  errors.cardNumber
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-light focus:ring-orange hover:border-orange/50'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-1">
                <svg className="w-8 h-6" viewBox="0 0 32 20" fill="none">
                  <rect width="32" height="20" rx="2" fill="#1434CB" />
                  <circle cx="12" cy="10" r="5" fill="#EB001B" />
                  <circle cx="20" cy="10" r="5" fill="#FF5F00" />
                </svg>
              </div>
            </div>
            {errors.cardNumber && (
              <p className="mt-1.5 text-sm text-red-500">{errors.cardNumber}</p>
            )}
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expiry"
                className="block text-sm font-medium text-orange-dark mb-2"
              >
                Expiry Date
              </label>
              <input
                id="expiry"
                type="text"
                placeholder="MM/YY"
                value={formData.expiry}
                onChange={(e) => handleChange('expiry', e.target.value)}
                className={clsx(
                  'w-full px-4 py-3 rounded-md border transition-colors',
                  'font-regular text-orange-dark placeholder:text-gray-slate/50',
                  'focus:outline-none focus:ring-2 focus:ring-offset-1',
                  errors.expiry
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-light focus:ring-orange hover:border-orange/50'
                )}
              />
              {errors.expiry && (
                <p className="mt-1.5 text-sm text-red-500">{errors.expiry}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="cvc"
                className="block text-sm font-medium text-orange-dark mb-2"
              >
                CVC
              </label>
              <input
                id="cvc"
                type="text"
                placeholder="123"
                value={formData.cvc}
                onChange={(e) => handleChange('cvc', e.target.value)}
                className={clsx(
                  'w-full px-4 py-3 rounded-md border transition-colors',
                  'font-regular text-orange-dark placeholder:text-gray-slate/50',
                  'focus:outline-none focus:ring-2 focus:ring-offset-1',
                  errors.cvc
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-light focus:ring-orange hover:border-orange/50'
                )}
              />
              {errors.cvc && (
                <p className="mt-1.5 text-sm text-red-500">{errors.cvc}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Information Section */}
      <div>
        <h3 className="text-lg font-bold text-orange-dark mb-4">
          Billing Information
        </h3>

        <div className="space-y-4">
          <Input
            id="name"
            type="text"
            label="Cardholder Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
          />

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-orange-dark mb-2"
              >
                Country
              </label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-4 py-3 rounded-md border border-gray-light transition-colors font-regular text-orange-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange hover:border-orange/50"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>

            <Input
              id="zipCode"
              type="text"
              label="Zip Code"
              placeholder="12345"
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              error={errors.zipCode}
            />
          </div>
        </div>
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
          Your payment information is secure and encrypted. We never store your
          card details.
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isProcessing}
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

