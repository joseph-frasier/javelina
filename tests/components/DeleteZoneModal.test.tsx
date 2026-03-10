import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DeleteZoneModal } from '@/components/modals/DeleteZoneModal';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: any }) => {
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

interface HarnessProps {
  onConfirm?: () => Promise<void> | void;
  isDeleting?: boolean;
  initialValue?: string;
  onClose?: () => void;
}

function DeleteZoneModalHarness({
  onConfirm = vi.fn(),
  isDeleting = false,
  initialValue = '',
  onClose = vi.fn(),
}: HarnessProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <DeleteZoneModal
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      zoneName="openworld.com"
      recordCount={3}
      confirmationInput={value}
      onConfirmationInputChange={setValue}
      isDeleting={isDeleting}
    />
  );
}

describe('DeleteZoneModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders warning hierarchy and starts with delete disabled', () => {
    render(<DeleteZoneModalHarness />);

    expect(screen.getByText('Permanently Delete Zone')).toBeInTheDocument();
    expect(screen.getAllByText(/openworld\.com/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Delete Zone' })).toBeDisabled();
  });

  it('enables delete only when exact zone name is entered and submits on click', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteZoneModalHarness onConfirm={onConfirm} />);

    const input = screen.getByLabelText(/Type .*openworld\.com.* to confirm/i);
    const deleteButton = screen.getByRole('button', { name: 'Delete Zone' });

    await user.type(input, 'openworld.com');
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('copies zone name to clipboard and shows copied feedback without auto-filling input', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<DeleteZoneModalHarness />);

    const input = screen.getByLabelText(/Type .*openworld\.com.* to confirm/i) as HTMLInputElement;
    await user.click(screen.getByRole('button', { name: 'Copy zone name' }));

    expect(writeText).toHaveBeenCalledWith('openworld.com');
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it('shows inline fallback feedback when clipboard copy fails', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('copy failed'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<DeleteZoneModalHarness />);

    await user.click(screen.getByRole('button', { name: 'Copy zone name' }));
    expect(screen.getByText(/Could not copy the zone name/i)).toBeInTheDocument();
  });

  it('disables controls while delete is in progress', () => {
    render(<DeleteZoneModalHarness isDeleting initialValue="openworld.com" />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByLabelText(/Type .*openworld\.com.* to confirm/i)).toBeDisabled();
  });
});
