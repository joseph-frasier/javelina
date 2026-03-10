import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditZoneModal, type EditZoneFormData } from '@/components/modals/EditZoneModal';

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

describe('EditZoneModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onFormDataChange = vi.fn();

  const baseFormData: EditZoneFormData = {
    name: 'openworld.com',
    description: '',
    admin_email: 'admin@example.com',
    negative_caching_ttl: 1800,
  };

  const renderModal = (overrides?: Partial<React.ComponentProps<typeof EditZoneModal>>) =>
    render(
      <EditZoneModal
        isOpen
        onClose={onClose}
        zoneName="openworld.com"
        formData={baseFormData}
        onFormDataChange={onFormDataChange}
        soaSerial={4}
        isSaving={false}
        onSave={onSave}
        {...overrides}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with SOA section collapsed by default and shows summary chips', async () => {
    renderModal();

    expect(await screen.findByText('Edit Zone: openworld.com')).toBeInTheDocument();
    const soaToggle = screen.getByRole('button', { name: /SOA Configuration/i });
    expect(soaToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Admin: admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Negative TTL: 1800s')).toBeInTheDocument();
    expect(screen.getByText('Serial: 4')).toBeInTheDocument();
    expect(screen.getByTestId('modal-root').querySelector('[data-state="closed"]')).toBeTruthy();
  });

  it('expands and collapses advanced SOA fields', async () => {
    const user = userEvent.setup();
    renderModal();

    const soaToggle = await screen.findByRole('button', { name: /SOA Configuration/i });
    await user.click(soaToggle);

    expect(soaToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('modal-root').querySelector('[data-state="open"]')).toBeTruthy();

    await user.click(soaToggle);
    expect(soaToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('modal-root').querySelector('[data-state="closed"]')).toBeTruthy();
  });

  it('sends controlled updates for editable fields', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Zone Name/i), {
      target: { value: 'example.com' },
    });

    expect(onFormDataChange).toHaveBeenCalled();
    const latestZoneNameUpdate = onFormDataChange.mock.calls[onFormDataChange.mock.calls.length - 1][0];
    expect(latestZoneNameUpdate).toMatchObject({
      name: 'example.com',
      admin_email: 'admin@example.com',
      negative_caching_ttl: 1800,
    });
  });

  it('shows description counter and updates based on provided data', async () => {
    renderModal({
      formData: {
        ...baseFormData,
        description: 'abc',
      },
    });

    expect(await screen.findByText('3/500 characters')).toBeInTheDocument();
  });

  it('calls onClose and onSave from footer actions', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables footer actions and shows saving label while saving', async () => {
    renderModal({ isSaving: true });

    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('keeps SOA serial read-only', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /SOA Configuration/i }));
    expect(screen.getByLabelText(/SOA Serial/i)).toBeDisabled();
  });
});
