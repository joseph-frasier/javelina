import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffViewer } from '@/components/dns/DiffViewer';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, title, subtitle, children }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal-root">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
    );
  },
}));

vi.mock('gsap', () => {
  const applyStyles = (target: any, vars: Record<string, unknown> = {}) => {
    if (target && typeof target === 'object' && 'style' in target) {
      Object.entries(vars).forEach(([key, value]) => {
        if (key === 'onComplete' || key === 'duration' || key === 'ease') return;
        (target as HTMLElement).style.setProperty(key, String(value));
      });
    }
    if (typeof vars.onComplete === 'function') {
      vars.onComplete();
    }
  };

  return {
    default: {
      killTweensOf: vi.fn(),
      set: vi.fn((target: any, vars: Record<string, unknown>) => applyStyles(target, vars)),
      to: vi.fn((target: any, vars: Record<string, unknown>) => applyStyles(target, vars)),
    },
  };
});

describe('DiffViewer', () => {
  const oldData = {
    id: 'zone-1',
    name: 'openworld.com',
    last_valid_serial: 5,
    updated_at: '2026-03-04T22:40:24.607Z',
  };

  const newData = {
    id: 'zone-1',
    name: 'openworld.com',
    last_valid_serial: 6,
    updated_at: '2026-03-04T22:42:02.284Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders formatted diff by default with mode toggle', () => {
    render(<DiffViewer oldData={oldData} newData={newData} tableName="zones" onClose={vi.fn()} isOpen />);

    expect(screen.getByText('Change Diff')).toBeInTheDocument();
    expect(screen.getByText('1 field(s) changed')).toBeInTheDocument();
    expect(screen.getByText('Last Valid Serial')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Formatted' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raw JSON' })).toBeInTheDocument();
  });

  it('switches between formatted and raw views', async () => {
    const user = userEvent.setup();
    render(<DiffViewer oldData={oldData} newData={newData} tableName="zones" onClose={vi.fn()} isOpen />);

    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));

    expect(screen.getByTestId('raw-before-json')).toBeInTheDocument();
    expect(screen.getByTestId('raw-after-json')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Formatted' }));

    expect(screen.getByText('Last Valid Serial')).toBeInTheDocument();
  });

  it('copies before JSON and keeps copy feedback scoped per side', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<DiffViewer oldData={oldData} newData={newData} tableName="zones" onClose={vi.fn()} isOpen />);

    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    await user.click(screen.getByTestId('copy-before-json'));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(oldData, null, 2));
    expect(within(screen.getByTestId('copy-before-json')).getByText('Copied!')).toBeInTheDocument();
    expect(within(screen.getByTestId('copy-after-json')).getByText('Copy')).toBeInTheDocument();
  });

  it('handles clipboard failure gracefully', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('copy failed'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<DiffViewer oldData={oldData} newData={newData} tableName="zones" onClose={vi.fn()} isOpen />);

    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    await user.click(screen.getByTestId('copy-before-json'));

    expect(screen.getByText(/Could not copy JSON/i)).toBeInTheDocument();
  });

  it('renders create state with null before payload in raw mode', async () => {
    const user = userEvent.setup();
    render(<DiffViewer oldData={null} newData={newData} tableName="zones" onClose={vi.fn()} isOpen />);

    expect(screen.getByText('New zone created')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    expect(screen.getByTestId('raw-before-json')).toHaveTextContent('null');
  });

  it('renders delete state with null after payload in raw mode', async () => {
    const user = userEvent.setup();
    render(<DiffViewer oldData={oldData} newData={null} tableName="zones" onClose={vi.fn()} isOpen />);

    expect(screen.getByText('Zone deleted')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    expect(screen.getByTestId('raw-after-json')).toHaveTextContent('null');
  });

  it('shows no-change empty state when no field differences exist', () => {
    render(<DiffViewer oldData={oldData} newData={oldData} tableName="zones" onClose={vi.fn()} isOpen />);

    expect(screen.getByText('No changes detected')).toBeInTheDocument();
  });
});
