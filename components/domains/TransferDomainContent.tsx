'use client';

import { useState, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import type { DomainTransferCheckResponse } from '@/types/domains';

type View = 'check' | 'checkout';

export default function TransferDomainContent() {
  const [view, setView] = useState<View>('check');
  const [domain, setDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<DomainTransferCheckResponse | null>(null);

  const { addToast } = useToastStore();

  const handleCheck = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) return;

    setIsChecking(true);
    setCheckResult(null);

    try {
      const result = await domainsApi.checkTransfer(trimmed);
      if (!result.transferable) {
        addToast('error', result.reason || 'This domain cannot be transferred at this time.');
      } else {
        setCheckResult(result);
      }
    } catch (err: any) {
      const message = err?.details || err?.message || 'Failed to check transfer eligibility';
      addToast('error', typeof message === 'string' ? message : 'Failed to check transfer eligibility');
    } finally {
      setIsChecking(false);
    }
  };

  const handleProceedToCheckout = () => {
    setView('checkout');
  };

  const handleCheckoutCancel = () => {
    setView('check');
  };

  const handleCheckoutSuccess = () => {
    setView('check');
    setCheckResult(null);
    setDomain('');
  };

  if (view === 'checkout' && checkResult?.transferable) {
    return (
      <div className="space-y-6">
        <DomainCheckoutForm
          domain={checkResult.domain}
          registrationType="transfer"
          price={checkResult.pricing?.price || 12.99}
          currency={checkResult.pricing?.currency || 'USD'}
          onCancel={handleCheckoutCancel}
          onSuccess={handleCheckoutSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Transfer a domain" description="Transfer a domain you own from another registrar.">
        <div className="space-y-6">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex gap-2.5">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              You&apos;ll need the authorization (EPP) code from your current registrar to complete the transfer.
            </p>
          </div>

          <form onSubmit={handleCheck} className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Domain name"
                placeholder="e.g. mydomain.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="text-lg py-3"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isChecking || !domain.trim()}
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Checking...
                </span>
              ) : (
                'Check transferability'
              )}
            </Button>
          </form>

          {checkResult?.transferable && (
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {checkResult.domain}
                    </p>
                  </div>
                  <p className="text-sm mt-1 text-green-600 dark:text-green-300">
                    This domain is eligible for transfer.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {checkResult.pricing && (
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      ${checkResult.pricing.price.toFixed(2)}/yr
                    </span>
                  )}
                  <Button variant="primary" size="sm" onClick={handleProceedToCheckout}>
                    Continue transfer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
