import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import * as deleteZoneAction from '@/lib/actions/zones';
import { useZones } from '@/lib/hooks/useZones';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the deleteZone server action
vi.mock('@/lib/actions/zones', () => ({
  deleteZone: vi.fn(),
}));

// Mock Supabase client
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

// Mock toast store
const mockAddToast = vi.fn();
vi.mock('@/lib/toast-store', () => ({
  useToastStore: () => ({
    addToast: mockAddToast,
  }),
}));

// Mock UI components
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, onClose }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Import React first
import React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/lib/toast-store';
import { Modal } from '@/components/ui/Modal';

// Test component that simulates the delete zone flow
function DeleteZoneTestComponent() {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const mockOrganization = { id: 'org-123', name: 'Test Org' };
  const mockZone = { id: 'zone-to-delete', name: 'delete-me.com' };
  
  const router = useRouter();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const { data: zones } = useZones(mockOrganization.id);

  const handleDeleteZone = async () => {
    const result = await deleteZoneAction.deleteZone(mockZone.id);
    
    if (result.error) {
      addToast('error', `Failed to delete zone: ${result.error}`);
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ['zones', mockOrganization.id] });
    addToast('success', `Zone ${mockZone.name} archived successfully`);
    setShowDeleteModal(false);
    router.push(`/organization/${mockOrganization.id}`);
  };

  return (
    <div>
      <h1>Zone Details: {mockZone.name}</h1>
      <button onClick={() => setShowDeleteModal(true)}>
        Delete Zone
      </button>

      {/* Delete Zone Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Zone"
        size="small"
      >
        <div>
          <p>
            Are you sure you want to delete <strong>{mockZone.name}</strong>?
          </p>
          <div>
            <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
            <button
              className="bg-red-600"
              onClick={handleDeleteZone}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Zones List */}
      <div data-testid="zones-list">
        {zones && zones.length > 0 ? (
          <ul>
            {zones.map((zone: any) => (
              <li key={zone.id}>{zone.name}</li>
            ))}
          </ul>
        ) : (
          <p>No zones found</p>
        )}
      </div>
    </div>
  );
}

// MSW server setup
let zonesData = [
  { id: 'zone-to-delete', name: 'delete-me.com', organization_id: 'org-123' },
  { id: 'zone-keep', name: 'keep-me.com', organization_id: 'org-123' },
];

const server = setupServer(
  http.get('http://localhost:3001/api/zones/organization/:orgId', () => {
    return HttpResponse.json({ data: zonesData });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  // Reset zones data
  zonesData = [
    { id: 'zone-to-delete', name: 'delete-me.com', organization_id: 'org-123' },
    { id: 'zone-keep', name: 'keep-me.com', organization_id: 'org-123' },
  ];
});
afterAll(() => server.close());

describe('Delete Zone Flow', () => {
  it('deletes a zone, redirects to organization page, and zone no longer appears in list', async () => {
    const user = userEvent.setup();

    // Mock deleteZone action to return success
    const mockDeleteZone = vi.spyOn(deleteZoneAction, 'deleteZone');
    mockDeleteZone.mockResolvedValue({
      success: true,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Render the component
    render(
      <QueryClientProvider client={queryClient}>
        <DeleteZoneTestComponent />
      </QueryClientProvider>
    );

    // Step 1: Verify zone appears initially
    await waitFor(() => {
      expect(screen.getByText('delete-me.com')).toBeInTheDocument();
    });

    // Step 2: Click "Delete Zone" button
    const deleteButton = screen.getByRole('button', { name: /Delete Zone/i });
    await user.click(deleteButton);

    // Step 3: Verify confirmation modal appears
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    });

    // Step 4: Update MSW to return zones list without the deleted zone
    zonesData = [{ id: 'zone-keep', name: 'keep-me.com', organization_id: 'org-123' }];

    // Step 5: Click "Confirm Delete" button in modal
    const confirmButton = screen.getByRole('button', { name: /Confirm Delete/i });
    await user.click(confirmButton);

    // Step 6: Verify deleteZone was called with correct zone ID
    await waitFor(() => {
      expect(mockDeleteZone).toHaveBeenCalledWith('zone-to-delete');
    });

    // Step 7: Verify success toast was shown
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('success', expect.stringContaining('delete-me.com'));
    });

    // Step 8: Verify redirect to organization page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/organization/org-123');
    });

    // Step 9: Invalidate cache and verify zone no longer in list
    await queryClient.invalidateQueries({ queryKey: ['zones', 'org-123'] });

    await waitFor(() => {
      expect(screen.queryByText('delete-me.com')).not.toBeInTheDocument();
      expect(screen.getByText('keep-me.com')).toBeInTheDocument();
    });
  });
});
