'use client';

import { useState } from 'react';
import { OctagonAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { LeadStatus } from '@/lib/api-client';

const TERMINAL_STATUSES: LeadStatus[] = ['live', 'routed_to_custom', 'abandoned', 'failed'];

interface Props {
  status: LeadStatus;
  onHalt: (reason: string) => void | Promise<void>;
  busy?: boolean;
}

/**
 * Pipeline-halt action — surfaces in the page header (top-right) so it's
 * visually separate from the scope-review actions, which only apply at
 * `agents_complete`. Halt is available across the lifecycle until the lead
 * reaches a terminal status.
 */
export function HaltPipelineButton({ status, onHalt, busy }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (TERMINAL_STATUSES.includes(status)) return null;

  const close = () => { setOpen(false); setReason(''); };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await onHalt(trimmed);
    close();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={busy}>
        <OctagonAlert className="w-3.5 h-3.5 mr-1.5" />
        Halt pipeline
      </Button>

      {open && (
        <Modal isOpen onClose={close} title="Halt pipeline">
          <p className="text-sm text-text-muted mb-3">
            Stops automation for this lead and removes it from the active queue. The lead and its data are preserved — engineering can resume or recover from the halted state once the issue is fixed.
          </p>
          <label className="block text-sm font-medium mb-1" htmlFor="halt-reason">
            Reason <span className="text-text-faint font-normal">(internal — audit log)</span>
          </label>
          <textarea
            id="halt-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm"
            rows={3}
            placeholder="e.g. OpenSRS registration failed after 3 retries"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              aria-label="Submit halt pipeline"
              disabled={!reason.trim() || busy}
              onClick={submit}
            >
              Halt pipeline
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
