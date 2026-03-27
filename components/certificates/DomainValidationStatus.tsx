'use client';

import { useState } from 'react';
import { certificatesApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { SslCertificate, DvAuthMethod } from '@/types/certificates';

interface DomainValidationStatusProps {
  certificate: SslCertificate;
  onUpdate?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function CopyableCodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <pre className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}

function DvAuthMethodBadge({ method }: { method: DvAuthMethod }) {
  const labels: Record<DvAuthMethod, string> = {
    dns: 'DNS Record',
    file: 'File Upload',
    email: 'Email Approval',
  };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
      {labels[method]}
    </span>
  );
}

function DnsInstructions({ details }: { details: Record<string, any> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-slate dark:text-gray-300">
        Add the following DNS record to your domain to verify ownership.
        Changes may take up to 48 hours to propagate.
      </p>
      {details.record_type && details.domain && (
        <CopyableCodeBlock label="Host / Name" value={details.domain} />
      )}
      {details.record_type && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Record Type
          </span>
          <p className="text-sm font-mono text-gray-800 dark:text-gray-200">{details.record_type}</p>
        </div>
      )}
      {details.value && (
        <CopyableCodeBlock label="Value" value={details.value} />
      )}
      {details.filename && (
        <CopyableCodeBlock label="CNAME / Filename" value={details.filename} />
      )}
      {/* Fallback: show full raw details if specific fields are absent */}
      {!details.value && !details.filename && (
        <CopyableCodeBlock label="Record Details" value={JSON.stringify(details, null, 2)} />
      )}
    </div>
  );
}

function FileInstructions({ details }: { details: Record<string, any> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-slate dark:text-gray-300">
        Upload a file at the specified path on your web server to verify domain ownership.
      </p>
      {details.filename && (
        <CopyableCodeBlock label="File Path" value={details.filename} />
      )}
      {details.contents && (
        <CopyableCodeBlock label="File Content" value={details.contents} />
      )}
      {!details.filename && !details.contents && (
        <CopyableCodeBlock label="File Details" value={JSON.stringify(details, null, 2)} />
      )}
    </div>
  );
}

function EmailInstructions({
  approverEmail,
  certificateId,
  onResent,
}: {
  approverEmail: string;
  certificateId: string;
  onResent?: () => void;
}) {
  const { addToast } = useToastStore();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await certificatesApi.resendApproval(certificateId);
      addToast('success', 'Approval email resent successfully.');
      onResent?.();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to resend approval email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-slate dark:text-gray-300">
        An approval email has been sent to the address below. Check your inbox and click the
        approval link to complete domain validation.
      </p>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{approverEmail}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        loading={isResending}
        disabled={isResending}
      >
        {isResending ? 'Resending...' : 'Resend Approval Email'}
      </Button>
    </div>
  );
}

const METHOD_OPTIONS: { value: DvAuthMethod; label: string; description: string }[] = [
  {
    value: 'email',
    label: 'Email Approval',
    description: 'Receive an approval email at a domain-related address.',
  },
  {
    value: 'dns',
    label: 'DNS Record',
    description: 'Add a TXT or CNAME record to your DNS zone.',
  },
  {
    value: 'file',
    label: 'File Upload',
    description: 'Upload a verification file to your web server.',
  },
];

function ChangeValidationMethod({
  certificateId,
  currentMethod,
  onUpdated,
}: {
  certificateId: string;
  currentMethod: DvAuthMethod;
  onUpdated?: () => void;
}) {
  const { addToast } = useToastStore();
  const [selectedMethod, setSelectedMethod] = useState<DvAuthMethod>(currentMethod);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (selectedMethod === currentMethod) return;
    setIsUpdating(true);
    try {
      await certificatesApi.updateValidation(certificateId, selectedMethod);
      addToast('success', 'Validation method updated successfully.');
      onUpdated?.();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update validation method.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {METHOD_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-orange/50 dark:hover:border-orange/50"
            style={{
              borderColor: selectedMethod === option.value ? undefined : undefined,
            }}
          >
            <input
              type="radio"
              name="dv_method"
              value={option.value}
              checked={selectedMethod === option.value}
              onChange={() => setSelectedMethod(option.value)}
              className="mt-0.5 accent-orange"
            />
            <div>
              <p className="text-sm font-medium text-orange-dark dark:text-white">{option.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={handleUpdate}
        disabled={isUpdating || selectedMethod === currentMethod}
        loading={isUpdating}
      >
        {isUpdating ? 'Updating...' : 'Update Method'}
      </Button>
    </div>
  );
}

export default function DomainValidationStatus({
  certificate,
  onUpdate,
}: DomainValidationStatusProps) {
  const method = certificate.dv_auth_method;
  const details = certificate.dv_auth_details;
  const approverEmail = certificate.approver_email;

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-orange-dark dark:text-white">
                Awaiting Domain Validation
              </p>
              {method && <DvAuthMethodBadge method={method} />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Complete the verification steps below to activate your certificate.
            </p>
          </div>
        </div>
      </Card>

      {/* Validation instructions */}
      {method && (
        <Card title="Verification Instructions">
          {method === 'dns' && details && <DnsInstructions details={details} />}
          {method === 'file' && details && <FileInstructions details={details} />}
          {method === 'email' && approverEmail && (
            <EmailInstructions
              approverEmail={approverEmail}
              certificateId={certificate.id}
              onResent={onUpdate}
            />
          )}
          {method === 'email' && !approverEmail && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No approver email on file. Please update your validation method.
            </p>
          )}
        </Card>
      )}

      {/* Change validation method */}
      {method && (
        <Card title="Change Validation Method">
          <ChangeValidationMethod
            certificateId={certificate.id}
            currentMethod={method}
            onUpdated={onUpdate}
          />
        </Card>
      )}
    </div>
  );
}
