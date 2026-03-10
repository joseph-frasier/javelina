import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DNSRecordDetailModal } from '@/components/modals/DNSRecordDetailModal';
import type { DNSRecord } from '@/types/dns';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal-root">
        <h2>{title}</h2>
        {children}
      </div>
    );
  },
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const recordFixture: DNSRecord = {
  id: 'rec-1',
  zone_id: 'zone-1',
  name: 'www',
  type: 'A',
  value: '193.4.3.2',
  ttl: 3600,
  comment: 'Primary web endpoint',
  metadata: null,
  created_by: 'user-1',
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-02T10:00:00.000Z',
};

describe('DNSRecordDetailModal', () => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders record summary and keeps technical metadata collapsed by default', async () => {
    render(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={recordFixture}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(await screen.findByText('DNS Record Details')).toBeInTheDocument();
    expect(screen.getAllByText('www')).toHaveLength(2);
    expect(screen.getAllByText('www.openworld.com').length).toBeGreaterThan(0);
    expect(screen.getByText('193.4.3.2')).toBeInTheDocument();
    expect(screen.getByText('3600 seconds')).toBeInTheDocument();
    expect(screen.getByText('~1 hour')).toBeInTheDocument();

    const metadataToggle = screen.getByRole('button', { name: /Technical Metadata/i });
    expect(metadataToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('technical-metadata-content')).toHaveAttribute('data-state', 'closed');
  });

  it('expands metadata section when disclosure is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={recordFixture}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const metadataToggle = await screen.findByRole('button', { name: /Technical Metadata/i });
    await user.click(metadataToggle);

    expect(metadataToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('technical-metadata-content')).toHaveAttribute('data-state', 'open');
  });

  it('calls edit and delete handlers then closes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={recordFixture}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(recordFixture);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={recordFixture}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(recordFixture);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not render a footer close button', async () => {
    render(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={recordFixture}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('renders copy controls for name, value, and ttl fields', async () => {
    const user = userEvent.setup();

    render(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={recordFixture}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const nameCopyButton = await screen.findByRole('button', { name: 'Copy name' });
    expect(nameCopyButton).toBeInTheDocument();

    const valueCopyButton = await screen.findByRole('button', { name: 'Copy value' });
    expect(valueCopyButton).toBeInTheDocument();

    const ttlCopyButton = await screen.findByRole('button', { name: 'Copy ttl' });
    expect(ttlCopyButton).toBeInTheDocument();

    // Ensure buttons are still interactive without throwing.
    await user.click(nameCopyButton);
    await user.click(valueCopyButton);
    await user.click(ttlCopyButton);
  });

  it('renders nothing when there is no record to display', () => {
    render(
      <DNSRecordDetailModal
        isOpen
        onClose={onClose}
        record={null}
        zoneName="openworld.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();
  });
});
