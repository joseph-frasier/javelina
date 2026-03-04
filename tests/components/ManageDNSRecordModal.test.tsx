import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageDNSRecordModal } from '@/components/modals/ManageDNSRecordModal';
import type { DNSRecord, DNSRecordFormData } from '@/types/dns';

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
  default: ({ children, loading, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('ManageDNSRecordModal', () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn<[(data: DNSRecordFormData) => Promise<void>]>();

  const renderModal = (
    overrides?: Partial<React.ComponentProps<typeof ManageDNSRecordModal>>
  ) =>
    render(
      <ManageDNSRecordModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        mode="add"
        zoneName="example.com"
        existingRecords={[]}
        {...overrides}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined as never);
  });

  it('renders common type row and keeps selected type visible while searching all types', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(await screen.findByText('Common Types')).toBeInTheDocument();
    expect(screen.getByTestId('record-type-A')).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Show all record types' }));
    await user.type(screen.getByLabelText('Search Types'), 'mail');

    expect(screen.getAllByTestId('record-type-MX').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('record-type-A').length).toBeGreaterThan(0);
  });

  it('keeps RFC3597 disabled in all-types list', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Show all record types' }));
    expect(await screen.findByTestId('record-type-RFC3597')).toBeDisabled();
  });

  it('composes MX guided inputs into the value payload', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByTestId('record-type-MX'));
    await user.type(screen.getByLabelText('Name'), '@');
    await user.type(screen.getByLabelText('Mail Server Hostname'), 'mail.example.com');
    await user.click(screen.getByRole('button', { name: 'Create Record' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MX',
          value: '10 mail.example.com',
        })
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('composes SRV guided inputs into the value payload', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Show all record types' }));
    await user.click(screen.getByTestId('record-type-SRV'));
    await user.type(screen.getByLabelText('Name'), '_sip._tcp');
    await user.type(screen.getByLabelText('Target'), 'sip.example.com');
    await user.click(screen.getByRole('button', { name: 'Create Record' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SRV',
          value: '10 10 5060 sip.example.com',
        })
      );
    });
  });

  it('composes CAA guided inputs into the value payload', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Show all record types' }));
    await user.click(screen.getByTestId('record-type-CAA'));
    await user.type(screen.getByLabelText('Name'), '@');
    await user.type(screen.getByLabelText('Value'), 'letsencrypt.org');
    await user.click(screen.getByRole('button', { name: 'Create Record' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAA',
          value: '0 issue "letsencrypt.org"',
        })
      );
    });
  });

  it('prefills guided fields in edit mode when structured value can be parsed', async () => {
    const editableMXRecord: DNSRecord = {
      id: 'rec-1',
      zone_id: 'zone-1',
      name: '@',
      type: 'MX',
      value: '20 mail.example.com',
      ttl: 3600,
      comment: null,
      metadata: null,
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    renderModal({
      mode: 'edit',
      record: editableMXRecord,
    });

    expect(await screen.findByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('mail.example.com')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Value mode: Guided' });
    expect(toggle).toBeInTheDocument();
    expect(screen.queryByText('Value Mode')).not.toBeInTheDocument();
    const headerTitle = screen.getByText('Guided MX Value');
    expect(headerTitle.parentElement).toContainElement(toggle);
  });

  it('falls back to raw mode in edit mode when structured value cannot be parsed and allows toggle to guided defaults', async () => {
    const user = userEvent.setup();
    const unparseableMXRecord: DNSRecord = {
      id: 'rec-2',
      zone_id: 'zone-1',
      name: '@',
      type: 'MX',
      value: 'mail.example.com',
      ttl: 3600,
      comment: null,
      metadata: null,
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    renderModal({
      mode: 'edit',
      record: unparseableMXRecord,
    });

    expect(await screen.findByDisplayValue('mail.example.com')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Value mode: Raw' });
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText('Raw MX Value')).toBeInTheDocument();
    expect(screen.queryByText('Value Mode')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(await screen.findByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Value mode: Guided' })).toBeInTheDocument();
    expect(screen.getByText('Guided MX Value')).toBeInTheDocument();
  });

  it('toggles guided to raw and keeps composed SRV value', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Show all record types' }));
    await user.click(screen.getByTestId('record-type-SRV'));
    await user.type(screen.getByLabelText('Target'), 'sip.example.com');

    const toggle = screen.getByRole('button', { name: 'Value mode: Guided' });
    expect(screen.getByText('Guided SRV Value')).toBeInTheDocument();
    await user.click(toggle);

    expect(await screen.findByDisplayValue('10 10 5060 sip.example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Value mode: Raw' })).toBeInTheDocument();
    expect(screen.getByText('Raw SRV Value')).toBeInTheDocument();
  });
});
