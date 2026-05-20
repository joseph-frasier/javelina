'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/lib/toast-store';
import { adminApi, ApiError } from '@/lib/api-client';
import { SERVICE_LABEL } from '@/app/admin/pipelines/_lib/runner-registry';
import type { OverrideTargetState } from './ServiceOverrideMenu';

type CustomerService = 'website' | 'dns' | 'email' | 'domain';

interface ServiceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  service: CustomerService;
  state: OverrideTargetState;
  onApplied: () => void | Promise<void>;
}

const STATE_VERB: Record<OverrideTargetState, string> = {
  live: 'Mark live',
  not_applicable: 'Mark not applicable',
  failed: 'Mark failed',
  needs_input: 'Mark needs input',
};

const LOCKED_CUSTOMER_LABEL: Partial<Record<OverrideTargetState, string>> = {
  live: 'Live',
  not_applicable: '—',
};

const CONFIRM_VARIANT: Record<OverrideTargetState, 'primary' | 'danger' | 'outline'> = {
  live: 'primary',
  not_applicable: 'outline',
  failed: 'danger',
  needs_input: 'outline',
};

export function ServiceOverrideModal({
  isOpen,
  onClose,
  leadId,
  service,
  state,
  onApplied,
}: ServiceOverrideModalProps) {
  const { addToast } = useToastStore();
  const [reason, setReason] = useState('');
  const [progressLabel, setProgressLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const needsCustomerMessage = state === 'failed' || state === 'needs_input';
  const lockedLabel = LOCKED_CUSTOMER_LABEL[state];
  const serviceLabel = SERVICE_LABEL[service];

  const reset = () => {
    setReason('');
    setProgressLabel('');
    setFieldError(null);
    setBusy(false);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setFieldError('Reason is required.');
      return;
    }
    if (needsCustomerMessage && !progressLabel.trim()) {
      setFieldError('Customer message is required.');
      return;
    }

    setFieldError(null);
    setBusy(true);
    try {
      await adminApi.intake.overrideService(leadId, service, {
        state,
        reason: trimmedReason,
        ...(needsCustomerMessage ? { progress_label: progressLabel.trim() } : {}),
      });
      addToast('success', `${serviceLabel} marked ${state.replace('_', ' ')}.`);
      reset();
      onClose();
      await onApplied();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.statusCode === 400) {
          // Validation — keep modal open, surface inline.
          const msg =
            (e.details as { error?: string } | undefined)?.error ??
            e.message ??
            'Validation failed.';
          setFieldError(msg);
          setBusy(false);
          return;
        }
        if (e.statusCode === 502) {
          // Local mirror updated, sync will retry.
          addToast(
            'warning',
            'Override applied locally — Javelina sync failed and will retry. Customer dashboard may not reflect this yet.'
          );
          reset();
          onClose();
          await onApplied();
          return;
        }
        addToast('error', 'Override failed. Try again, or contact engineering if this persists.');
      } else {
        addToast('error', 'Override failed. Try again, or contact engineering if this persists.');
      }
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`${STATE_VERB[state]} — ${serviceLabel}`}
      size="medium"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          {state === 'live' &&
            "The customer's dashboard will immediately show this service as live. Logged in the audit trail and tagged \"admin\" in the activity feed."}
          {state === 'not_applicable' &&
            'This service will be marked as not applicable for this customer. Logged in the audit trail.'}
          {state === 'failed' &&
            'The customer will see this tile as failed with the message you enter below.'}
          {state === 'needs_input' &&
            'The customer will see this tile flagged for input with the message you enter below.'}
        </p>

        {/* Customer-facing preview */}
        <div className="rounded-lg border border-border bg-surface-alt p-3">
          <div className="text-xs uppercase tracking-wide text-text-faint mb-1.5">
            Customer will see
          </div>
          {needsCustomerMessage ? (
            <div className="text-sm text-text">
              <span className="font-medium">{serviceLabel}: </span>
              <span className="italic">
                {progressLabel.trim() || 'Type a message below…'}
              </span>
            </div>
          ) : (
            <div className="text-sm text-text">
              <span className="font-medium">{serviceLabel}: </span>
              <span>{lockedLabel}</span>
            </div>
          )}
        </div>

        {needsCustomerMessage && (
          <div>
            <label
              htmlFor="override-progress-label"
              className="block text-sm font-medium text-text mb-1"
            >
              Customer message
            </label>
            <textarea
              id="override-progress-label"
              value={progressLabel}
              onChange={(e) => setProgressLabel(e.target.value)}
              rows={2}
              className="w-full p-2 border border-border rounded text-sm bg-surface text-text"
              placeholder={
                state === 'failed'
                  ? 'e.g. Domain transfer failed — please contact support'
                  : 'e.g. We need your DNS provider login'
              }
              disabled={busy}
            />
            <p className="mt-1 text-xs text-text-faint">
              Shown directly on the customer&rsquo;s dashboard tile.
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="override-reason"
            className="block text-sm font-medium text-text mb-1"
          >
            Reason <span className="text-text-faint font-normal">(internal — audit log)</span>
          </label>
          <input
            id="override-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm bg-surface text-text"
            placeholder="e.g. manually provisioned mailbox via M365 admin console"
            disabled={busy}
          />
        </div>

        {fieldError && (
          <div className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {fieldError}
          </div>
        )}

        {(state === 'live' || state === 'not_applicable') && (
          <div className="rounded border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            ⚠️ When automation for this service ships, future runs may overwrite this state.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={CONFIRM_VARIANT[state]}
            onClick={submit}
            disabled={busy}
            loading={busy}
          >
            {STATE_VERB[state]}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
