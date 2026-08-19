import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddZoneModal } from '@/components/modals/AddZoneModal';

vi.mock('@/lib/api-client', () => ({
  zonesApi: { checkNameAvailable: vi.fn() },
  subscriptionsApi: { getOrgPlan: vi.fn().mockResolvedValue({ plan_code: 'pro' }) },
}));

vi.mock('@/lib/actions/zones', () => ({
  createZone: vi.fn().mockResolvedValue({ data: { id: 'z1', name: 'example.com' } }),
}));

vi.mock('@/lib/supabase/client', () => {
  throw new Error('AddZoneModal must not import the Supabase browser client');
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({ limits: { zones: -1 }, tier: 'pro', wouldExceedLimit: () => false }),
}));

vi.mock('@/lib/hooks/useUsageCounts', () => ({
  useUsageCounts: () => ({ usage: { zones: 0 }, refetch: vi.fn() }),
}));

vi.mock('@/lib/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ hideUpgradeLimitCta: false }),
}));

import { zonesApi } from '@/lib/api-client';
import { createZone } from '@/lib/actions/zones';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  organizationId: '11111111-1111-4111-8111-111111111111',
  organizationName: 'Acme',
  planCode: 'pro',
};

function fillAndSubmit(name: string) {
  const nameInput = screen.getByLabelText(/zone name/i);
  fireEvent.change(nameInput, { target: { value: name } });
  fireEvent.submit(nameInput.closest('form')!);
}

describe('AddZoneModal server-side name validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks the backend whether the name is available', async () => {
    (zonesApi.checkNameAvailable as any).mockResolvedValue({ available: true });

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('example.com');

    await waitFor(() => {
      expect(zonesApi.checkNameAvailable).toHaveBeenCalledWith('example.com');
    });
  });

  it('blocks submission and shows the conflict when the backend reports one', async () => {
    (zonesApi.checkNameAvailable as any).mockResolvedValue({
      available: false,
      conflict: 'example.com',
    });

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('api.example.com');

    await waitFor(() => {
      expect(
        screen.getByText(/conflicts with existing zone: example\.com/i)
      ).toBeInTheDocument();
    });
    expect(createZone).not.toHaveBeenCalled();
  });

  it('proceeds to create the zone when the name is available', async () => {
    (zonesApi.checkNameAvailable as any).mockResolvedValue({ available: true });

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('example.com');

    await waitFor(() => {
      expect(createZone).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'example.com' })
      );
    });
  });

  it('still creates the zone if the availability check errors (POST /zones enforces it)', async () => {
    (zonesApi.checkNameAvailable as any).mockRejectedValue(new Error('network down'));

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('example.com');

    await waitFor(() => {
      expect(createZone).toHaveBeenCalled();
    });
  });
});
