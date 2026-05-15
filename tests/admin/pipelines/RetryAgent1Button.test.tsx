import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RetryAgent1Button,
  isAgent1Failure,
} from '@/app/admin/pipelines/_components/RetryAgent1Button';
import type { LeadDetail, LeadStatus } from '@/lib/api-client';

function makeLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
  return {
    id: 'lead-1', firm_id: 'f', org_id: 'o',
    package: 'business_starter',
    contact_email: 'a@b.c', contact_name: 'A',
    status: 'failed',
    version: 1, total_cost_cents: 0,
    created_at: '2026-05-06T00:00:00Z',
    form_submitted_at: '2026-05-06T00:01:00Z',
    agents_completed_at: null,
    scope_confirmed_at: null, scope_rejected_at: null,
    scope_rejection_reason: null,
    updated_at: '2026-05-06T00:00:00Z',
    lead_record: null, research_report: null, similarity_report: null,
    upsell_risk_report: null, copy_prep: null, design_prep: null,
    ...overrides,
  };
}

describe('isAgent1Failure', () => {
  it('true when failed + form submitted + no lead_record', () => {
    expect(isAgent1Failure(makeLead())).toBe(true);
  });

  it('false when status is not failed', () => {
    const statuses: LeadStatus[] = [
      'created', 'form_submitted', 'agents_complete',
      'scope_confirmed', 'provisioning', 'live',
      'routed_to_custom', 'abandoned',
    ];
    for (const status of statuses) {
      expect(isAgent1Failure(makeLead({ status }))).toBe(false);
    }
  });

  it('false when form was never submitted', () => {
    expect(isAgent1Failure(makeLead({ form_submitted_at: null }))).toBe(false);
  });

  it('false when lead_record exists (Agent 1 succeeded; later agent failed)', () => {
    expect(
      isAgent1Failure(
        makeLead({ lead_record: { id: 'lr-1' } as unknown as LeadDetail['lead_record'] })
      )
    ).toBe(false);
  });
});

describe('RetryAgent1Button', () => {
  it('renders nothing when not an Agent 1 failure', () => {
    const { container } = render(
      <RetryAgent1Button lead={makeLead({ status: 'live' })} onRetry={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the button when Agent 1 failed', () => {
    render(<RetryAgent1Button lead={makeLead()} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /retry agent 1/i })).toBeInTheDocument();
  });

  it('opens confirmation modal with cost-warning copy', async () => {
    const user = userEvent.setup();
    render(<RetryAgent1Button lead={makeLead()} onRetry={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /retry agent 1/i }));
    expect(await screen.findByText(/re-run agent 1/i)).toBeInTheDocument();
    expect(screen.getByText(/fresh anthropic api call/i)).toBeInTheDocument();
  });

  it('calls onRetry when submit is clicked', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RetryAgent1Button lead={makeLead()} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /retry agent 1/i }));
    const submit = await screen.findByRole('button', { name: /submit retry agent 1/i });
    await user.click(submit);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables the trigger and submit while busy', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RetryAgent1Button lead={makeLead()} onRetry={vi.fn()} busy={false} />
    );
    await user.click(screen.getByRole('button', { name: /retry agent 1/i }));
    rerender(<RetryAgent1Button lead={makeLead()} onRetry={vi.fn()} busy={true} />);
    expect(screen.getByRole('button', { name: /submit retry agent 1/i })).toBeDisabled();
  });
});
