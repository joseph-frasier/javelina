'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { LeadDetail } from '@/lib/api-client';

interface Props {
  lead: LeadDetail;
  onConfirmScope: () => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
  busy?: boolean;
}

type ModalKind = 'confirm' | 'reject' | null;

/**
 * Scope-review actions — only meaningful while the lead is in
 * `agents_complete` (the green-button moment). The pipeline-halt action
 * lives separately (HaltPipelineButton) since it's a broader-state action
 * with different intent.
 */
export function OperatorActions({ lead, onConfirmScope, onReject, busy }: Props) {
  const [open, setOpen] = useState<ModalKind>(null);
  const [reason, setReason] = useState('');

  if (lead.status !== 'agents_complete') return null;

  const closeModal = () => { setOpen(null); setReason(''); };

  const submitReject = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await onReject(trimmed);
    closeModal();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={() => setOpen('confirm')} disabled={busy}>
        Confirm scope
      </Button>
      <Button variant="outline" onClick={() => setOpen('reject')} disabled={busy}>
        Reject
      </Button>

      {open === 'confirm' && (
        <Modal isOpen onClose={closeModal} title="Confirm scope">
          <p className="text-sm text-text-muted mb-4">
            Confirm scope and start provisioning? This emits <code>intake/scope.confirmed</code>. Idempotent.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => { await onConfirmScope(); closeModal(); }}
              disabled={busy}
            >
              Confirm scope
            </Button>
          </div>
        </Modal>
      )}

      {open === 'reject' && (
        <Modal isOpen onClose={closeModal} title="Reject lead — route to custom build">
          <label className="block text-sm font-medium mb-1" htmlFor="reject-reason">Reason</label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm"
            rows={3}
            placeholder="e.g. scope mismatch — they want a Shopify store"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              aria-label="Submit reject"
              disabled={!reason.trim() || busy}
              onClick={submitReject}
            >
              Submit reject
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
