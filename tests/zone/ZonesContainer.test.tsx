import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ZonesContainer } from '@/components/organization/ZonesContainer';
import * as useZonesHook from '@/lib/hooks/useZones';

// Mock the useZones hook
vi.mock('@/lib/hooks/useZones');

describe('ZonesContainer', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('shows loading state then displays zones when data loads', async () => {
    // Mock the hook to return loading state first
    const mockUseZones = vi.spyOn(useZonesHook, 'useZones');
    
    // First call: loading state
    mockUseZones.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false,
      status: 'pending',
    } as any);

    // Render the component
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ZonesContainer organizationId="org-123" />
      </QueryClientProvider>
    );

    // Assert: Loading state should be visible
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByText('Loading zones...')).toBeInTheDocument();

    // Mock the hook to return success state with data
    mockUseZones.mockReturnValue({
      data: [
        { id: '1', name: 'example.com', organization_id: 'org-123', records_count: 5 },
        { id: '2', name: 'test.io', organization_id: 'org-123', records_count: 3 },
        { id: '3', name: 'myapp.dev', organization_id: 'org-123', records_count: 8 },
      ],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      status: 'success',
    } as any);

    // Rerender to simulate state change
    rerender(
      <QueryClientProvider client={queryClient}>
        <ZonesContainer organizationId="org-123" />
      </QueryClientProvider>
    );

    // Assert: Loading should be gone
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();

    // Assert: Zone names should now be visible
    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });
    expect(screen.getByText('test.io')).toBeInTheDocument();
    expect(screen.getByText('myapp.dev')).toBeInTheDocument();

    // Assert: Record counts should be visible
    expect(screen.getByText('5 records')).toBeInTheDocument();
    expect(screen.getByText('3 records')).toBeInTheDocument();
    expect(screen.getByText('8 records')).toBeInTheDocument();

    // Assert: Zones list container should exist
    expect(screen.getByTestId('zones-list')).toBeInTheDocument();
  });
});
