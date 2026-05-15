'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { LeadDetail } from '@/lib/api-client';

interface Props {
  lead: Pick<LeadDetail, 'status' | 'form_submitted_at' | 'lead_record'>;
  onRetry: () => void | Promise<void>;
  busy?: boolean;
}

// Agent 1 (preprocessing/enrichment) is what produces `lead_record`. If the
// lead reached `failed` after the form was submitted but no lead_record was
// ever written, Agent 1 is the failure point and is the one worth retrying.
export function isAgent1Failure(
  lead: Pick<LeadDetail, 'status' | 'form_submitted_at' | 'lead_record'>
): boolean {
  return (
    lead.status === 'failed' &&
    lead.form_submitted_at != null &&
    lead.lead_record == null
  );
}

export function RetryAgent1Button({ lead, onRetry, busy }: Props) {
  const [open, setOpen] = useState(false);

  if (!isAgent1Failure(lead)) return null;

  const close = () => setOpen(false);

  const submit = async () => {
    await onRetry();
    close();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={busy}>
        <RotateCw className="w-3.5 h-3.5 mr-1.5" />
        Retry Agent 1
      </Button>

      {open && (
        <Modal isOpen onClose={close} title="Retry Agent 1">
          <p className="text-sm text-text-muted">
            Re-run Agent 1 for this lead? This will use the existing form data and
            incur a fresh Anthropic API call.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              aria-label="Submit retry agent 1"
              disabled={busy}
              onClick={submit}
            >
              Retry Agent 1
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
