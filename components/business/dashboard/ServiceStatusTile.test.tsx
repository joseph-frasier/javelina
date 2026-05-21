import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceStatusTile } from './ServiceStatusTile';
import type { Tokens } from '@/components/business/ui/tokens';
import type { ServiceTileData } from '@/lib/business/service-status';

const t: Tokens = {
  bg: '#fff', surface: '#fff', surfaceAlt: '#f5f5f5', surfaceHover: '#eee',
  border: '#ddd', borderStrong: '#bbb',
  text: '#111', textMuted: '#555', textFaint: '#888',
  accent: '#f80', accentHover: '#e70', accentSoft: '#fc8', accentSoftStrong: '#fa6',
  ring: '#fa6', success: '#0a0', warning: '#fa0', danger: '#c00',
  shadowSm: '', shadowMd: '', shadowLg: '',
};

function tile(overrides: Partial<ServiceTileData> = {}): ServiceTileData {
  return {
    service: 'website',
    title: 'Your site',
    state: 'in_progress',
    progressLabel: null,
    phase: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('ServiceStatusTile', () => {
  it('renders the tile title', () => {
    render(<ServiceStatusTile t={t} tile={tile({ title: 'Your site' })} />);
    expect(screen.getByText('Your site')).toBeInTheDocument();
  });

  it('renders the progress label verbatim when present', () => {
    render(
      <ServiceStatusTile
        t={t}
        tile={tile({ state: 'in_progress', progressLabel: 'Generated page-by-page copy for your site' })}
      />,
    );
    expect(screen.getByText('Generated page-by-page copy for your site')).toBeInTheDocument();
  });

  it('renders not_started placeholder copy when no progress label', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'not_started', progressLabel: null })} />);
    expect(screen.getByText('Waiting to start')).toBeInTheDocument();
  });

  it('renders failed copy', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'failed' })} />);
    expect(screen.getByText('Our team is investigating.')).toBeInTheDocument();
  });

  it('renders needs_input copy when no progress label', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'needs_input', progressLabel: null })} />);
    expect(screen.getByText("We'll let you know if we need anything from you.")).toBeInTheDocument();
  });

  it('renders live copy', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'live' })} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders not_applicable copy', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'not_applicable' })} />);
    expect(screen.getByText('Not included in your plan.')).toBeInTheDocument();
  });
});
