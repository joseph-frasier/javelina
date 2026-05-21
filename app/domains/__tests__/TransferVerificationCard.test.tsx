import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransferVerificationCard } from '@/components/domains/TransferVerificationCard';
import type { Domain } from '@/types/domains';

vi.mock('@/lib/toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  domainsApi: {
    getAuthCode: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

const baseDomain: Domain = {
  id: 'd1',
  user_id: 'u1',
  domain_name: 'example.com',
  tld: '.com',
  status: 'active',
  registration_type: 'new',
  years: 1,
  auto_renew: false,
  currency: 'usd',
  created_at: '',
  updated_at: '',
};

describe('TransferVerificationCard', () => {
  it('renders nothing for linked domain', () => {
    const { container } = render(
      <TransferVerificationCard
        domain={{ ...baseDomain, registration_type: 'linked' }}
        domainLocked={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows reveal button for active registered domain', () => {
    render(<TransferVerificationCard domain={baseDomain} domainLocked={false} />);
    expect(
      screen.getByRole('button', { name: /reveal transfer code/i })
    ).toBeEnabled();
  });

  it('disables reveal when domain is locked', () => {
    render(<TransferVerificationCard domain={baseDomain} domainLocked={true} />);
    expect(
      screen.getByRole('button', { name: /reveal transfer code/i })
    ).toBeDisabled();
    expect(screen.getByText(/disable domain lock/i)).toBeInTheDocument();
  });

  it('shows verification pill for transferred domain', () => {
    render(
      <TransferVerificationCard
        domain={{ ...baseDomain, registration_type: 'transfer' }}
        domainLocked={false}
        verification={{
          verified: false,
          deadline: '2099-01-01T00:00:00Z',
          email: 'a@b.com',
        }}
      />
    );
    expect(screen.getByText(/pending verification/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /resend verification email/i })
    ).toBeEnabled();
  });

  it('shows verified pill when verified=true', () => {
    render(
      <TransferVerificationCard
        domain={{ ...baseDomain, registration_type: 'transfer' }}
        domainLocked={false}
        verification={{ verified: true, deadline: null, email: 'a@b.com' }}
      />
    );
    expect(screen.getByText(/^verified$/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend verification email/i })
    ).not.toBeInTheDocument();
  });
});
