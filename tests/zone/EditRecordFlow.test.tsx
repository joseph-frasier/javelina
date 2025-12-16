import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import type { DNSRecord, DNSRecordFormData } from '@/types/dns';
import { ManageDNSRecordModal } from '@/components/modals/ManageDNSRecordModal';
import { DNSRecordsTable } from '@/components/dns/DNSRecordsTable';
import { updateDNSRecord } from '@/lib/actions/dns-records';

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

// Mock UI components for simpler rendering
vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/admin/ExportButton', () => ({
  ExportButton: () => null,
}));

// Test component that integrates modal and records table for editing
function EditRecordTestComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null);
  const [records, setRecords] = useState<DNSRecord[]>([
    {
      id: 'record-1',
      zone_id: 'zone-123',
      type: 'A',
      name: 'api',
      value: '1.2.3.4',
      ttl: 3600,
      priority: null,
      comment: 'API server',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'record-2',
      zone_id: 'zone-123',
      type: 'A',
      name: 'www',
      value: '192.168.1.1',
      ttl: 3600,
      priority: null,
      comment: 'Web server',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  const handleRecordClick = (record: DNSRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: DNSRecordFormData) => {
    if (!editingRecord) return;

    // Call the real updateDNSRecord server action - MSW will intercept the fetch
    const updatedRecord = await updateDNSRecord(editingRecord.id, formData);

    // Simulate refetch behavior - update the record in state
    setRecords((prev) =>
      prev.map((r) => (r.id === editingRecord.id ? { ...r, ...updatedRecord } : r))
    );
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  return (
    <div>
      <h1>DNS Records for example.com</h1>

      {records.length > 0 && (
        <DNSRecordsTable
          records={records}
          selectedRecords={selectedRecords}
          onSelectionChange={setSelectedRecords}
          onRecordClick={handleRecordClick}
          zoneName="example.com"
        />
      )}

      {isModalOpen && editingRecord && (
        <ManageDNSRecordModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={handleSubmit}
          mode="edit"
          record={editingRecord}
          zoneName="example.com"
          existingRecords={records}
        />
      )}
    </div>
  );
}

// MSW server setup
const server = setupServer(
  // PUT DNS record endpoint - called by updateDNSRecord server action
  http.put('http://localhost:3001/api/dns-records/:recordId', async ({ request, params }) => {
    const body = (await request.json()) as any;
    const recordId = params.recordId as string;

    // Return the updated record
    return HttpResponse.json({
      data: {
        id: recordId,
        zone_id: 'zone-123',
        type: body.type,
        name: body.name,
        value: body.value,
        ttl: body.ttl,
        priority: body.priority || null,
        comment: body.comment || '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Edit DNS Record UI Flow', () => {
  it('allows user to edit a DNS record and see the updated value in the table', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Step 1: Render the component with existing records
    render(
      <QueryClientProvider client={queryClient}>
        <EditRecordTestComponent />
      </QueryClientProvider>
    );

    // Verify initial state - both records are visible with original values
    expect(screen.getByText('DNS Records for example.com')).toBeInTheDocument();

    // Wait for table to render
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Verify original value "1.2.3.4" is displayed
    const originalValueElements = screen.getAllByText('1.2.3.4');
    expect(originalValueElements.length).toBeGreaterThan(0);

    // Verify "api" record is present
    const apiElements = screen.getAllByText('api');
    expect(apiElements.length).toBeGreaterThan(0);

    // Step 2: Click on the "api" record row to edit it
    // DNSRecordsTable makes rows clickable via onRecordClick
    const tableRows = screen.getAllByRole('row');
    // Find the row containing "api" and "1.2.3.4"
    const apiRow = tableRows.find((row) => {
      const text = row.textContent || '';
      return text.includes('api') && text.includes('1.2.3.4');
    });

    expect(apiRow).toBeDefined();
    await user.click(apiRow!);

    // Step 3: Verify edit modal opens with prefilled values
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/@ \(root\) or subdomain/i)).toBeInTheDocument();
    });

    // Verify the name field is prefilled with "api"
    const nameInput = screen.getByPlaceholderText(/@ \(root\) or subdomain/i);
    expect(nameInput).toHaveValue('api');

    // Verify the value field is prefilled with "1.2.3.4"
    const valueInput = screen.getByPlaceholderText('192.0.2.1');
    expect(valueInput).toHaveValue('1.2.3.4');

    // Step 4: Change the value to "5.6.7.8"
    await user.clear(valueInput);
    await user.type(valueInput, '5.6.7.8');

    // Step 5: Submit the form
    const saveButton = screen.getByRole('button', { name: /save changes/i });

    // Wait for validation to pass (button becomes enabled)
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    await user.click(saveButton);

    // Step 6: Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });

    // Step 7: Verify the updated value "5.6.7.8" appears in the table
    await waitFor(() => {
      const updatedValueElements = screen.getAllByText('5.6.7.8');
      expect(updatedValueElements.length).toBeGreaterThan(0);
    });

    // Step 8: Verify the old value "1.2.3.4" is no longer present
    expect(screen.queryByText('1.2.3.4')).not.toBeInTheDocument();

    // Step 9: Verify the record name "api" is still present
    const remainingApiElements = screen.getAllByText('api');
    expect(remainingApiElements.length).toBeGreaterThan(0);

    // Step 10: Verify the other record "www" is unchanged
    const wwwElements = screen.getAllByText('www');
    expect(wwwElements.length).toBeGreaterThan(0);
    const wwwValueElements = screen.getAllByText('192.168.1.1');
    expect(wwwValueElements.length).toBeGreaterThan(0);
  });
});
