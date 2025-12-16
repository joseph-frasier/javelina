import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ZonesContainer } from '@/components/organization/ZonesContainer';

// Mock Supabase client for authentication
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'fake-token' },
        },
      }),
    },
  })),
}));

// MSW server setup with failing endpoint
const server = setupServer(
  // GET zones endpoint - returns 500 error
  http.get('http://localhost:3001/api/zones/organization/:orgId', () => {
    return new HttpResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Error State Rendering', () => {
  it('displays error message when API request fails instead of rendering empty content', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for faster test
        },
      },
    });

    // Step 1: Render component that fetches data
    render(
      <QueryClientProvider client={queryClient}>
        <ZonesContainer organizationId="org-123" />
      </QueryClientProvider>
    );

    // Step 2: Verify loading state appears initially
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByText('Loading zones...')).toBeInTheDocument();

    // Step 3: Wait for API call to complete (and fail)
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // Step 4: Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    // Step 5: Verify specific error text (from API response or fallback)
    expect(
      screen.getByText(/Internal server error|Failed to load zones/)
    ).toBeInTheDocument();

    // Step 6: Assert error is rendered in red text (user-visible styling)
    const errorContainer = screen.getByText(/Error:/).parentElement;
    expect(errorContainer).toHaveClass('text-red-600');

    // Step 7: Assert component does NOT silently render empty content
    // (i.e., no "No zones found" message, which is for successful but empty response)
    expect(screen.queryByText('No zones found')).not.toBeInTheDocument();
    
    // Step 8: Assert zones list does not exist
    expect(screen.queryByTestId('zones-list')).not.toBeInTheDocument();
  });
});
