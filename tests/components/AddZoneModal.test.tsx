import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddZoneModal } from '@/components/modals/AddZoneModal';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  invalidateQueries: vi.fn(),
  addToast: vi.fn(),
  createZone: vi.fn(),
  refetchUsage: vi.fn(),
  usage: { zones: 0 },
  isUsageLoading: false,
  limits: { zones: 10 },
  tier: 'starter',
  overlapResult: { hasOverlap: false, conflictingZone: null },
  hideUpgradeLimitCta: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}));

vi.mock('@/lib/actions/zones', () => ({
  createZone: (...args: unknown[]) => mocks.createZone(...args),
}));

vi.mock('@/lib/toast-store', () => ({
  useToastStore: () => ({
    addToast: mocks.addToast,
  }),
}));

vi.mock('@/lib/hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    limits: mocks.limits,
    tier: mocks.tier,
    wouldExceedLimit: (_resource: string, currentCount: number) =>
      mocks.limits.zones !== -1 && currentCount >= mocks.limits.zones,
  }),
}));

vi.mock('@/lib/hooks/useUsageCounts', () => ({
  useUsageCounts: () => ({
    usage: mocks.usage,
    isLoading: mocks.isUsageLoading,
    refetch: mocks.refetchUsage,
  }),
}));

vi.mock('@/lib/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({
    hideUpgradeLimitCta: mocks.hideUpgradeLimitCta,
  }),
}));

vi.mock('@/lib/utils/dns-validation', () => ({
  detectZoneOverlap: (...args: unknown[]) => mocks.overlapResult,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: async () => ({
        data: [{ name: 'existing.com' }],
        error: null,
      }),
    }),
  }),
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
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/Input', () => ({
  default: ({ ...props }: any) => <input {...props} />,
}));

describe('AddZoneModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  const renderModal = (overrides?: Partial<React.ComponentProps<typeof AddZoneModal>>) =>
    render(
      <AddZoneModal
        isOpen
        onClose={onClose}
        organizationId="org-1"
        organizationName="Crimson Desert"
        planCode="starter"
        onSuccess={onSuccess}
        {...overrides}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usage = { zones: 0 };
    mocks.isUsageLoading = false;
    mocks.refetchUsage.mockResolvedValue(undefined);
    mocks.limits = { zones: 10 };
    mocks.tier = 'starter';
    mocks.overlapResult = { hasOverlap: false, conflictingZone: null };
    mocks.hideUpgradeLimitCta = false;
    mocks.createZone.mockResolvedValue({
      data: { id: 'zone-1', name: 'newzone.com' },
    });
  });

  it('does not show limit callout under 80% usage', async () => {
    mocks.usage = { zones: 7 };
    renderModal();

    expect(await screen.findByText('Add Zone')).toBeInTheDocument();
    expect(screen.queryByTestId('zone-limit-callout')).not.toBeInTheDocument();
  });

  it('shows near-limit callout and keeps save enabled with valid name', async () => {
    const user = userEvent.setup();
    mocks.usage = { zones: 8 };
    renderModal();

    expect(await screen.findByText('Approaching Zone Limit')).toBeInTheDocument();
    expect(screen.getByText('8 / 10 zones')).toBeInTheDocument();
    expect(screen.getByText('80% used')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Zone Name/i), 'example.com');
    expect(screen.getByRole('button', { name: 'Save Zone' })).toBeEnabled();
  });

  it('shows limit callout immediately when usage exists during refetch', async () => {
    mocks.usage = { zones: 10 };
    mocks.isUsageLoading = true;
    renderModal();

    expect(await screen.findByText('Zone Limit Reached')).toBeInTheDocument();
    expect(screen.getByText('10 / 10 zones')).toBeInTheDocument();
  });

  it('shows at-limit callout and disables save', async () => {
    mocks.usage = { zones: 10 };
    renderModal();

    expect(await screen.findByText('Zone Limit Reached')).toBeInTheDocument();
    expect(
      screen.getByText('Creating zones is disabled until you upgrade your plan.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Zone' })).toBeDisabled();
  });

  it('uses lifetime plan name in limit copy when on a lifetime plan', async () => {
    mocks.usage = { zones: 10 };
    renderModal({ planCode: 'starter_lifetime' });

    expect(await screen.findByText('Zone Limit Reached')).toBeInTheDocument();
    expect(
      screen.getByText("You've reached the zone limit for Starter Lifetime. Upgrade to add more zones.")
    ).toBeInTheDocument();
  });

  it('routes to billing when clicking Upgrade Plan with org id', async () => {
    const user = userEvent.setup();
    mocks.usage = { zones: 10 };
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Upgrade Plan' }));
    expect(mocks.push).toHaveBeenCalledWith('/settings/billing/org-1?openModal=true');
  });

  it('routes to pricing when no organization id is provided', async () => {
    const user = userEvent.setup();
    mocks.usage = { zones: 10 };
    renderModal({ organizationId: '' });

    await user.click(await screen.findByRole('button', { name: 'Upgrade Plan' }));
    expect(mocks.push).toHaveBeenCalledWith('/pricing');
  });

  it('hides upgrade CTA when feature flag is enabled', async () => {
    mocks.usage = { zones: 10 };
    mocks.hideUpgradeLimitCta = true;
    renderModal();

    expect(await screen.findByText('Zone Limit Reached')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upgrade Plan' })).not.toBeInTheDocument();
  });

  it('submits successfully and preserves create-zone flow behavior', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/Zone Name/i), 'NewZone.com');
    await user.type(screen.getByLabelText(/Description/i), 'My new zone');
    await user.clear(screen.getByLabelText(/Admin Email/i));
    await user.type(screen.getByLabelText(/Admin Email/i), 'admin@test.com');
    await user.clear(screen.getByLabelText(/Negative Caching TTL/i));
    await user.type(screen.getByLabelText(/Negative Caching TTL/i), '7200');

    await user.click(screen.getByRole('button', { name: 'Save Zone' }));

    await waitFor(() => {
      expect(mocks.createZone).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'newzone.com',
          description: 'My new zone',
          organization_id: 'org-1',
          admin_email: 'admin@test.com',
          negative_caching_ttl: 7200,
        })
      );
    });

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['zones', 'org-1'] });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.addToast).toHaveBeenCalledWith('success', 'Zone "newzone.com" created successfully!');
    expect(onSuccess).toHaveBeenCalledWith('zone-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
