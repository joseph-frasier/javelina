import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MySiteCard } from '@/components/business/dashboard/MySiteCard';
import type { BusinessDetail } from '@/lib/api/business';

const lightTokens = {
  accent: '#EF7215',
  accentSoft: '#FEEBDA',
  bg: '#F2F2F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F7',
  border: '#E5E5E5',
  borderStrong: '#D9D9D9',
  text: '#0B0C0D',
  textMuted: '#456173',
  textFaint: '#9BA3AE',
  shadowSm: '0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
  danger: '#C0392B',
  // The Tokens shape has a few more fields; cast to satisfy the type at
  // call sites without dragging the full token surface into these tests.
} as unknown as Parameters<typeof MySiteCard>[0]['t'];

function provisioningWith(state: string): BusinessDetail['provisioning'] {
  return [
    {
      service: 'website',
      state,
      internal_state: null,
      progress_label: null,
      metadata: {},
      updated_at: '2026-05-19T00:00:00.000Z',
    },
  ];
}

describe('MySiteCard', () => {
  it('renders the building state when the website tile is in_progress', () => {
    render(
      <MySiteCard
        t={lightTokens}
        provisioning={provisioningWith('in_progress')}
        domain="acme.com"
      />,
    );
    expect(screen.getByText(/We're building your site/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /visit my site/i })).toBeNull();
  });

  it('renders the building state when no website tile exists', () => {
    render(<MySiteCard t={lightTokens} provisioning={[]} domain="acme.com" />);
    expect(screen.getByText(/We're building your site/i)).toBeTruthy();
  });

  it.each(['not_started', 'needs_input', 'failed', 'not_applicable'])(
    'renders the building state for %s',
    (state) => {
      render(
        <MySiteCard
          t={lightTokens}
          provisioning={provisioningWith(state)}
          domain="acme.com"
        />,
      );
      expect(screen.getByText(/We're building your site/i)).toBeTruthy();
    },
  );

  it('renders the live state with a Visit my site link when state is live and a domain is set', () => {
    render(
      <MySiteCard
        t={lightTokens}
        provisioning={provisioningWith('live')}
        domain="acme.com"
      />,
    );
    expect(screen.getByText(/Your site is live/i)).toBeTruthy();
    expect(screen.getByText('acme.com')).toBeTruthy();
    const link = screen.getByRole('link', { name: /visit my site/i });
    expect(link.getAttribute('href')).toBe('https://acme.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders the live state with a disabled button when the domain is missing', () => {
    render(
      <MySiteCard
        t={lightTokens}
        provisioning={provisioningWith('live')}
        domain={undefined}
      />,
    );
    expect(screen.getByText(/Your site is live/i)).toBeTruthy();
    expect(
      screen.getByText(/Domain not configured yet — contact support/i),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: /visit my site/i })).toBeNull();
    const btn = screen.getByRole('button', { name: /visit my site/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
