import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageTeamMembersModal } from '@/components/modals/ManageTeamMembersModal';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
}));

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
  default: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/Dropdown', () => ({
  default: ({ value, options, onChange, disabled }: any) => (
    <select
      aria-label="Role dropdown"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {options.map((option: { value: string; label: string }) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/ui/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    message,
    onClose,
    onConfirm,
    cancelText,
    confirmText,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
    cancelText: string;
    confirmText: string;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <button type="button" onClick={onClose}>
          {cancelText}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    );
  },
}));

vi.mock('@/lib/api-client', () => ({
  organizationsApi: {
    updateMemberRole: (...args: unknown[]) => mocks.updateMemberRole(...args),
    removeMember: (...args: unknown[]) => mocks.removeMember(...args),
  },
}));

vi.mock('@/lib/toast-store', () => ({
  useToastStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) =>
    selector({ addToast: mocks.addToast }),
}));

const usersFixture = [
  {
    user_id: 'user-1',
    name: 'Andrew Frasier',
    email: 'andrew.frasier@irongrove.com',
    role: 'BillingContact' as const,
  },
];

describe('ManageTeamMembersModal', () => {
  const onClose = vi.fn();
  const onMemberUpdated = vi.fn();
  const onMemberRemoved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMemberRole.mockResolvedValue(undefined);
    mocks.removeMember.mockResolvedValue(undefined);
  });

  const renderModal = () =>
    render(
      <ManageTeamMembersModal
        isOpen
        onClose={onClose}
        users={usersFixture}
        organizationName="Crimson Desert"
        organizationId="org-1"
        onMemberUpdated={onMemberUpdated}
        onMemberRemoved={onMemberRemoved}
      />
    );

  it('renders modal summary and formatted role label', async () => {
    renderModal();

    expect(await screen.findByText('Manage Team Members - Crimson Desert')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
    expect(screen.getByText('Andrew Frasier')).toBeInTheDocument();
    expect(screen.getByText('andrew.frasier@irongrove.com')).toBeInTheDocument();
    expect(screen.getByText('Billing Contact')).toBeInTheDocument();
    expect(screen.queryByText('BillingContact')).not.toBeInTheDocument();
  });

  it('does not render a footer close button', async () => {
    renderModal();

    expect(await screen.findByRole('button', { name: /Edit Role/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('supports role editing save flow', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Edit role for Andrew Frasier/i }));
    await user.selectOptions(screen.getByLabelText('Role dropdown'), 'Viewer');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mocks.updateMemberRole).toHaveBeenCalledWith('org-1', 'user-1', 'Viewer');
    });
    expect(onMemberUpdated).toHaveBeenCalledTimes(1);
    expect(mocks.addToast).toHaveBeenCalledWith('success', 'Member role updated successfully');
  });

  it('cancels role edit without calling the update API', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Edit role for Andrew Frasier/i }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.updateMemberRole).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Role dropdown')).not.toBeInTheDocument();
  });

  it('opens and cancels remove confirmation without API call', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Remove Andrew Frasier/i }));

    const confirmModal = screen.getByTestId('confirm-modal');
    expect(within(confirmModal).getByText('Remove Team Member')).toBeInTheDocument();
    await user.click(within(confirmModal).getByRole('button', { name: 'Cancel' }));

    expect(mocks.removeMember).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('confirms remove and calls API/callback', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Remove Andrew Frasier/i }));
    const confirmModal = screen.getByTestId('confirm-modal');

    expect(
      within(confirmModal).getByText(
        'Are you sure you want to remove Andrew Frasier from Crimson Desert?'
      )
    ).toBeInTheDocument();

    await user.click(within(confirmModal).getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(mocks.removeMember).toHaveBeenCalledWith('org-1', 'user-1');
    });
    expect(onMemberRemoved).toHaveBeenCalledTimes(1);
    expect(mocks.addToast).toHaveBeenCalledWith(
      'success',
      'Andrew Frasier has been removed from Crimson Desert'
    );
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('shows error toast when role update fails', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.updateMemberRole.mockRejectedValueOnce(new Error('Role update failed'));
    renderModal();

    await user.click(await screen.findByRole('button', { name: /Edit role for Andrew Frasier/i }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith('error', 'Role update failed');
    });

    consoleErrorSpy.mockRestore();
  });
});
