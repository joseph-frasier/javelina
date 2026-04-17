'use client';

import { useState, FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import type { DomainTransferCheckResponse } from '@/types/domains';

interface TransferDomainContentProps {
  onCheckout: (domain: string, price: number, currency: string) => void;
}

export default function TransferDomainContent({ onCheckout }: TransferDomainContentProps) {
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
    if (checkResult?.transferable) {
      onCheckout(
        checkResult.domain,
        checkResult.pricing?.price || 12.99,
        checkResult.pricing?.currency || 'USD'
      );
    }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-gray-slate shadow-md border border-gray-light hover:shadow-lg transition-shadow p-6 lg:p-8 space-y-6 max-w-5xl w-full">
      <div>
        <h2 className="text-2xl font-bold text-orange">Transfer a domain</h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-2">
          Transfer a domain you own from another registrar.
        </p>
      </div>

      <form onSubmit={handleCheck} className="space-y-4">
        <Input
          label="Domain name"
          placeholder="e.g. mydomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          maxLength={253}
          className="text-sm py-2"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isChecking || !domain.trim()}
        >
          {isChecking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Checking...
            </span>
          ) : (
            'Check transferability'
          )}
        </Button>
      </form>

      {checkResult?.transferable && (
        <div className="p-5 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {checkResult.domain}
                </p>
              </div>
              <p className="text-sm mt-1 text-green-600 dark:text-green-300 ml-7">
                This domain is eligible for transfer.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {checkResult.pricing && (
                <span className="text-base text-gray-600 dark:text-gray-300 font-semibold">
                  ${checkResult.pricing.price.toFixed(2)}/yr
                </span>
              )}
              <Button variant="primary" size="lg" onClick={handleProceedToCheckout}>
                Continue transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer tips when no result shown */}
      {!checkResult && !isChecking && (
        <div className="space-y-4 pt-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Before you transfer</p>
          <ul className="space-y-3">
            {[
              'Unlock your domain at your current registrar',
              'Disable WHOIS privacy protection temporarily',
              'Domain must be at least 60 days old',
              'Obtain the EPP/authorization code from your registrar\'s domain management panel',
              'Transfers typically complete within 5-7 days',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 text-orange mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
