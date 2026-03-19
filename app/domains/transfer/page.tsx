'use client';

import { useState, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';
import { domainsApi } from '@/lib/api-client';
import type { DomainTransferCheckResponse } from '@/types/domains';

type View = 'check' | 'checkout';

export default function TransferDomainPage() {
  const [view, setView] = useState<View>('check');
  const [domain, setDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<DomainTransferCheckResponse | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleCheck = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) return;

    setIsChecking(true);
    setCheckError(null);
    setCheckResult(null);

    try {
      const result = await domainsApi.checkTransfer(trimmed);
      setCheckResult(result);
    } catch (err: any) {
      const message = err?.details || err?.message || 'Failed to check transfer eligibility';
      setCheckError(typeof message === 'string' ? message : 'Failed to check transfer eligibility');
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
      <Card title="Transfer a domain">
        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Transfer a domain you already own from another registrar.
            You&apos;ll need the authorization (EPP) code from your current registrar.
          </p>

          <form onSubmit={handleCheck} className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Domain name"
                placeholder="e.g. mydomain.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
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

          {checkError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{checkError}</p>
            </div>
          )}

          {checkResult && (
            <div
              className={`p-4 rounded-lg border ${
                checkResult.transferable
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`font-medium ${
                      checkResult.transferable
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {checkResult.domain}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      checkResult.transferable
                        ? 'text-green-600 dark:text-green-300'
                        : 'text-red-600 dark:text-red-300'
                    }`}
                  >
                    {checkResult.transferable
                      ? 'This domain is eligible for transfer.'
                      : checkResult.reason || 'This domain cannot be transferred at this time.'}
                  </p>
                </div>

                {checkResult.transferable && (
                  <div className="flex items-center gap-4">
                    {checkResult.pricing && (
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                        ${checkResult.pricing.price.toFixed(2)}/yr
                      </span>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleProceedToCheckout}
                    >
                      Continue transfer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
