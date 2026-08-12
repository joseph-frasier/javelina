import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
// NB: no jest-dom matchers (toBeInTheDocument etc). setupTests.ts extends them
// at runtime but the project declares no types for them, so using one adds a
// tsc error — the same TS2339 regression 65be2a5 had to clean up. getBy*
// throws when absent, so a truthiness assertion carries the same meaning.
import userEvent from '@testing-library/user-event';
import { GrantAppliedPanel } from '@/components/billing/GrantAppliedPanel';
import { EMPTY_GRANT_SUMMARY } from '@/lib/discounts/format';

describe('GrantAppliedPanel', () => {
  it('renders the summary and duration', () => {
    render(<GrantAppliedPanel summary="20% off plan" duration="for 3 months" />);
    expect(screen.getByText('20% off plan')).toBeTruthy();
    expect(screen.getByText('for 3 months')).toBeTruthy();
  });

  // The field the admin modal promises is "Shown to the customer when they
  // redeem the code" and the backend ships in its trimmed public payload.
  // Nothing rendered it before this component existed.
  it('renders the customer-facing blurb when the code carries one', () => {
    render(
      <GrantAppliedPanel
        summary="20% off plan"
        duration="for 3 months"
        blurb="Welcome aboard — your first three months are on us."
      />,
    );
    expect(
      screen.getByText('Welcome aboard — your first three months are on us.'),
    ).toBeTruthy();
  });

  it('omits the blurb line entirely when there is none', () => {
    const { container } = render(<GrantAppliedPanel summary="Waived" duration="ongoing" />);
    expect(container.querySelector('.italic')).toBeNull();
  });

  // stripe_sync: 'deferred' — the grant is recorded but the org's subscription
  // is not in a live state, so the invoice-side discount lands later. Saying
  // "applied" flat out would be a promise the Stripe side has not kept yet.
  it('says the discount is still applying when the Stripe sync is deferred', () => {
    render(<GrantAppliedPanel summary="Waived" duration="ongoing" pendingSync />);
    expect(screen.getByText(/applying to your billing/i)).toBeTruthy();
  });

  it('says nothing about applying when the sync landed', () => {
    render(<GrantAppliedPanel summary="Waived" duration="ongoing" />);
    expect(screen.queryByText(/applying to your billing/i)).toBeNull();
  });

  // Checkout dismisses to remove a preview; billing settings dismisses to
  // redeem another code. Those mean different things and must not share a
  // label, which is why it is a required prop rather than a default.
  it('labels the dismiss control with what dismissing actually does', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <GrantAppliedPanel
        summary="20% off"
        duration="ongoing"
        onDismiss={onDismiss}
        dismissLabel="Remove discount"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove discount' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    rerender(
      <GrantAppliedPanel
        summary="20% off"
        duration="ongoing"
        onDismiss={onDismiss}
        dismissLabel="Redeem another code"
      />,
    );
    expect(screen.getByRole('button', { name: 'Redeem another code' })).toBeTruthy();
  });

  it('renders no dismiss control when there is nothing to dismiss', () => {
    render(<GrantAppliedPanel summary="20% off" duration="ongoing" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  // Both surfaces previously hard-coded their own sentence for this state and
  // had already drifted apart.
  it('renders the one shared empty-grant headline', () => {
    render(<GrantAppliedPanel summary={EMPTY_GRANT_SUMMARY} duration="ongoing" />);
    expect(screen.getByText('Discount applied to this organization.')).toBeTruthy();
  });
});
