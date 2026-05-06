import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorActions } from '@/app/admin/pipelines/_components/OperatorActions';
import type { LeadDetail } from '@/lib/api-client';

function makeLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
  return {
    id: 'lead-1', firm_id: 'f', org_id: 'o',
    package: 'business_starter',
    contact_email: 'a@b.c', contact_name: 'A',
    status: 'agents_complete',
    version: 1, total_cost_cents: 0,
    created_at: '2026-05-06T00:00:00Z',
    form_submitted_at: null, agents_completed_at: null,
    scope_confirmed_at: null, scope_rejected_at: null,
    scope_rejection_reason: null,
    updated_at: '2026-05-06T00:00:00Z',
    lead_record: null, research_report: null, similarity_report: null,
    upsell_risk_report: null, copy_prep: null, design_prep: null,
    ...overrides,
  };
}

describe('OperatorActions', () => {
  it('shows confirm + reject when status=agents_complete', () => {
    render(
      <OperatorActions
        lead={makeLead({ status: 'agents_complete' })}
        onConfirmScope={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /confirm scope/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject/i })).toBeInTheDocument();
  });

  it('renders nothing when status is not agents_complete', () => {
    const { container } = render(
      <OperatorActions
        lead={makeLead({ status: 'provisioning' })}
        onConfirmScope={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for terminal status', () => {
    const { container } = render(
      <OperatorActions
        lead={makeLead({ status: 'live' })}
        onConfirmScope={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('reject modal blocks submission when reason is empty', async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(
      <OperatorActions
        lead={makeLead({ status: 'agents_complete' })}
        onConfirmScope={vi.fn()}
        onReject={onReject}
      />
    );

    await user.click(screen.getByRole('button', { name: /^reject/i }));
    const submit = await screen.findByRole('button', { name: /submit reject/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/reason/i), '   ');
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText(/reason/i));
    await user.type(screen.getByLabelText(/reason/i), 'real reason');
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onReject).toHaveBeenCalledWith('real reason');
  });
});
