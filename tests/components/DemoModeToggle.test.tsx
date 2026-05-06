import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/lib/auth-store';
import { useDashboardModeStore } from '@/lib/dashboard-mode-store';

function mountAs(opts: { superadmin: boolean }) {
  useAuthStore.setState({
    // @ts-expect-error minimal user
    user: { id: 'u1', email: 'a@b', role: 'user', superadmin: opts.superadmin, display_name: 'Test' },
    profileReady: true,
  });
}

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Header />
    </QueryClientProvider>,
  );
}

describe('Header demo mode toggle', () => {
  beforeEach(() => {
    useDashboardModeStore.setState({ mode: 'real' });
  });

  it('non-superadmins never see the toggle', async () => {
    mountAs({ superadmin: false });
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /User menu/ }));
    expect(screen.queryByRole('menuitem', { name: /Demo data/ })).toBeNull();
  });

  it('superadmins see the toggle and can flip it', async () => {
    mountAs({ superadmin: true });
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: /User menu/ }));
    const item = screen.getByRole('menuitem', { name: /Demo data/ });
    expect(item).toHaveTextContent(/OFF/);
    await userEvent.click(item);
    expect(useDashboardModeStore.getState().mode).toBe('mock');
  });

  it('shows DEMO badge next to logo when mock is on', () => {
    mountAs({ superadmin: true });
    useDashboardModeStore.setState({ mode: 'mock' });
    renderHeader();
    expect(screen.getByText('DEMO')).toBeInTheDocument();
  });

  it('hides DEMO badge when mock is off', () => {
    mountAs({ superadmin: true });
    renderHeader();
    expect(screen.queryByText('DEMO')).toBeNull();
  });
});
