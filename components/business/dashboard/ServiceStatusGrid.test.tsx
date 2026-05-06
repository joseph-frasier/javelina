import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceStatusGrid } from './ServiceStatusGrid';
import type { Tokens } from '@/components/business/ui/tokens';
import type { BusinessDetail } from '@/lib/api/business';

const t: Tokens = {
  bg: '#fff', surface: '#fff', surfaceAlt: '#f5f5f5', surfaceHover: '#eee',
  border: '#ddd', borderStrong: '#bbb',
  text: '#111', textMuted: '#555', textFaint: '#888',
  accent: '#f80', accentHover: '#e70', accentSoft: '#fc8', accentSoftStrong: '#fa6',
  ring: '#fa6', success: '#0a0', warning: '#fa0', danger: '#c00',
  shadowSm: '', shadowMd: '', shadowLg: '',
};

function withProvisioning(
  rows: BusinessDetail['provisioning'],
): { provisioning: BusinessDetail['provisioning'] } {
  return { provisioning: rows };
}

describe('ServiceStatusGrid', () => {
  it('renders 4 tiles in canonical order even with empty provisioning', () => {
    render(<ServiceStatusGrid t={t} {...withProvisioning([])} />);
    const titles = screen.getAllByText(/^(Your site|DNS|Email|Domain)$/);
    expect(titles.map((el) => el.textContent)).toEqual(['Your site', 'DNS', 'Email', 'Domain']);
  });

  it('renders the default headline for empty provisioning', () => {
    render(<ServiceStatusGrid t={t} {...withProvisioning([])} />);
    expect(screen.getByText('Setting up your business…')).toBeInTheDocument();
  });

  it('renders the all-live headline when every service is live', () => {
    const live = (service: string): BusinessDetail['provisioning'][number] => ({
      service,
      state: 'live',
      internal_state: null,
      progress_label: null,
      metadata: {},
      updated_at: '2026-05-06T00:00:00Z',
    });
    render(
      <ServiceStatusGrid
        t={t}
        {...withProvisioning([live('website'), live('dns'), live('email'), live('domain')])}
      />,
    );
    expect(screen.getByText('Your business is live.')).toBeInTheDocument();
  });

  it('renders snag headline when any tile is failed', () => {
    render(
      <ServiceStatusGrid
        t={t}
        {...withProvisioning([
          {
            service: 'website',
            state: 'failed',
            internal_state: null,
            progress_label: null,
            metadata: {},
            updated_at: '2026-05-06T00:00:00Z',
          },
        ])}
      />,
    );
    expect(screen.getByText('We hit a snag — our team is on it.')).toBeInTheDocument();
  });

  it('renders the website progress_label inside the website tile', () => {
    render(
      <ServiceStatusGrid
        t={t}
        {...withProvisioning([
          {
            service: 'website',
            state: 'in_progress',
            internal_state: null,
            progress_label: 'Generated page-by-page copy for your site',
            metadata: { phase: 'content' },
            updated_at: '2026-05-06T00:00:00Z',
          },
        ])}
      />,
    );
    expect(screen.getByText('Generated page-by-page copy for your site')).toBeInTheDocument();
  });
});
