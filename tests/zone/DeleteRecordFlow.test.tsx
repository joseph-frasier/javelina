import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import React, { useState } from 'react';
import type { DNSRecord } from '@/types/dns';
import { deleteDNSRecord } from '@/lib/actions/dns-records';

// Mock Supabase server client for authentication
vi.mock('@/lib/supabase/server', () => ({
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

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock toast store
vi.mock('@/lib/toast-store', () => ({
  useToastStore: () => ({
    addToast: vi.fn(),
  }),
}));

// Simple confirmation modal component
function ConfirmDeleteModal({
  isOpen,
  recordName,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  recordName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-labelledby="delete-modal-title">
      <h2 id="delete-modal-title">Delete DNS Record</h2>
      <p>Are you sure you want to delete the record "{recordName}"?</p>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>Confirm Delete</button>
    </div>
  );
}

// Test component that displays DNS records with delete functionality
function DeleteRecordTestComponent() {
  const [records, setRecords] = useState<DNSRecord[]>([
    {
      id: 'record-1',
      zone_id: 'zone-123',
      type: 'A',
      name: 'www',
      value: '192.168.1.1',
      ttl: 3600,
      priority: null,
      comment: 'Web server',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'record-2',
      zone_id: 'zone-123',
      type: 'A',
      name: 'api',
      value: '1.2.3.4',
      ttl: 3600,
      priority: null,
      comment: 'API server',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]);

  const [recordToDelete, setRecordToDelete] = useState<DNSRecord | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDeleteClick = (record: DNSRecord) => {
    setRecordToDelete(record);
    setShowConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      // Call the real deleteDNSRecord server action - MSW will intercept the fetch
      await deleteDNSRecord(recordToDelete.id);

      // Simulate refetch - remove the deleted record from state
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      setShowConfirmation(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
    setRecordToDelete(null);
  };

  return (
    <div>
      <h1>DNS Records for example.com</h1>

      <div data-testid="records-list">
        {records.map((record) => (
          <div key={record.id} data-testid={`record-${record.name}`}>
            <span>{record.name}</span>
            <span>{record.type}</span>
            <span>{record.value}</span>
            <button
              onClick={() => handleDeleteClick(record)}
              aria-label={`Delete ${record.name} record`}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {records.length === 0 && <p>No DNS records found</p>}

      <ConfirmDeleteModal
        isOpen={showConfirmation}
        recordName={recordToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

// MSW server setup
const server = setupServer(
  // DELETE DNS record endpoint - called by deleteDNSRecord server action
  http.delete('http://localhost:3001/api/dns-records/:recordId', ({ params }) => {
    // Successfully delete the record
    return new HttpResponse(null, { status: 204 });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Delete DNS Record UI Flow', () => {
  it('allows user to delete a DNS record and see it removed from the table', async () => {
    const user = userEvent.setup();

    // Step 1: Render the component with two existing records
    render(<DeleteRecordTestComponent />);

    // Verify initial state - both records are visible
    expect(screen.getByText('DNS Records for example.com')).toBeInTheDocument();
    expect(screen.getByTestId('record-www')).toBeInTheDocument();
    expect(screen.getByTestId('record-api')).toBeInTheDocument();

    // Verify both record names are displayed
    const wwwElements = screen.getAllByText('www');
    expect(wwwElements.length).toBeGreaterThan(0);
    const apiElements = screen.getAllByText('api');
    expect(apiElements.length).toBeGreaterThan(0);

    // Step 2: Click delete button for the "www" record
    const deleteWwwButton = screen.getByLabelText('Delete www record');
    await user.click(deleteWwwButton);

    // Step 3: Verify confirmation modal appears
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete the record "www"/i)).toBeInTheDocument();

    // Step 4: Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
    await user.click(confirmButton);

    // Step 5: Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Step 6: Verify the "www" record is no longer in the DOM
    await waitFor(() => {
      expect(screen.queryByTestId('record-www')).not.toBeInTheDocument();
    });

    // Step 7: Verify the "www" record text is removed
    const remainingWwwElements = screen.queryAllByText('www');
    expect(remainingWwwElements.length).toBe(0);

    // Step 8: Verify the "api" record is still present
    expect(screen.getByTestId('record-api')).toBeInTheDocument();
    const remainingApiElements = screen.getAllByText('api');
    expect(remainingApiElements.length).toBeGreaterThan(0);

    // Step 9: Verify the record value is also removed
    expect(screen.queryByText('192.168.1.1')).not.toBeInTheDocument();
    expect(screen.getByText('1.2.3.4')).toBeInTheDocument();
  });
});
