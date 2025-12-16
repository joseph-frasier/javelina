import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useZones } from '@/lib/hooks/useZones';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'fake-token-123' },
        },
      }),
    },
  })),
}));

// Mock API response data
const mockZones = [
  { id: '1', name: 'example.com', organization_id: 'org-123', records_count: 5 },
  { id: '2', name: 'test.com', organization_id: 'org-123', records_count: 3 },
];

// Setup MSW to intercept API calls
const server = setupServer(
  http.get('http://localhost:3001/api/zones/organization/:orgId', () => {
    return HttpResponse.json({ data: mockZones });
  })
);

// Start server before tests, stop after
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useZones', () => {
  it('fetches and returns zones from the API', async () => {
    // Create a test QueryClient
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }, // Don't retry on failure in tests
      },
    });

    // Wrapper component that provides React Query context
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Render the hook
    const { result } = renderHook(() => useZones('org-123'), { wrapper });

    // Wait for the hook to finish loading
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Assert: The hook should return the mocked zones
    expect(result.current.data).toEqual(mockZones);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('example.com');
  });
});
