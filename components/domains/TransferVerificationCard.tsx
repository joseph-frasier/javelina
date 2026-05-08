'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import type { Domain, DomainVerification } from '@/types/domains';

interface Props {
  domain: Domain;
  domainLocked: boolean;
  verification?: DomainVerification;
}

const REVEAL_TIMEOUT_MS = 60_000;

type AddToast = (type: 'success' | 'error' | 'info', msg: string) => void;

export function TransferVerificationCard({ domain, domainLocked, verification }: Props) {
  const { addToast } = useToastStore();

  const showTransferCode =
    domain.registration_type !== 'linked' && domain.status === 'active';
  const showVerification = domain.registration_type === 'transfer';

  if (!showTransferCode && !showVerification) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-gray-slate shadow-md border border-gray-light p-6 space-y-6">
      <h3 className="text-base font-semibold text-orange">
        Transfer &amp; Verification
      </h3>

      {showTransferCode && (
        <TransferCodeSection
          domainId={domain.id}
          domainLocked={domainLocked}
          addToast={addToast}
        />
      )}

      {showVerification && (
        <VerificationSection
          domain={domain}
          verification={verification}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function TransferCodeSection({
  domainId,
  domainLocked,
  addToast,
}: {
  domainId: string;
  domainLocked: boolean;
  addToast: AddToast;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleReveal = async () => {
    setLoading(true);
    try {
      const result = await domainsApi.getAuthCode(domainId);
      setCode(result.auth_code);
      timerRef.current = setTimeout(() => setCode(null), REVEAL_TIMEOUT_MS);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not retrieve transfer code';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  const handleHide = () => {
    setCode(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div>
      <p className="text-sm font-medium text-orange-dark dark:text-white">
        Transfer this domain away
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        If you&apos;re moving this domain to another registrar, you&apos;ll need
        an authorization code (EPP code).
      </p>

      {domainLocked ? (
        <div className="mt-3">
          <Button variant="secondary" size="sm" disabled>
            Reveal transfer code
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Disable Domain Lock above to retrieve your transfer code.
          </p>
        </div>
      ) : code ? (
        <div className="mt-3 flex items-center gap-3">
          <code className="px-3 py-2 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-mono text-sm text-orange-dark dark:text-white">
            {code}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="text-sm text-orange hover:text-orange/70 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleHide}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Hide
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={handleReveal}
          >
            {loading ? 'Retrieving...' : 'Reveal transfer code'}
          </Button>
        </div>
      )}
    </div>
  );
}

function VerificationSection({
  domain,
  verification,
  addToast,
}: {
  domain: Domain;
  verification?: DomainVerification;
  addToast: AddToast;
}) {
  const [resending, setResending] = useState(false);
  const verified = verification?.verified ?? false;
  const deadline = verification?.deadline;
  const email = verification?.email;

  const expired =
    !verified && deadline ? new Date(deadline).getTime() < Date.now() : false;

  const pillClass = verified
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : expired
      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  const pillLabel = verified
    ? 'Verified'
    : expired
      ? 'Verification expired'
      : 'Pending verification';

  const handleResend = async () => {
    setResending(true);
    try {
      await domainsApi.resendVerification(domain.id);
      addToast('success', 'Verification email sent.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not resend verification email.';
      addToast('error', message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-orange-dark dark:text-white">
          Registrant Verification
        </p>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillClass}`}
        >
          {pillLabel}
        </span>
      </div>
      {!verified && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {email ? (
            <>
              Verification email sent to <strong>{email}</strong>.{' '}
            </>
          ) : null}
          {deadline ? (
            <>
              Verify by{' '}
              <strong>{new Date(deadline).toLocaleDateString()}</strong> or your
              domain may be suspended.
            </>
          ) : null}
        </p>
      )}
      {!verified && (
        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={resending}
            onClick={handleResend}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </Button>
        </div>
      )}
    </div>
  );
}
