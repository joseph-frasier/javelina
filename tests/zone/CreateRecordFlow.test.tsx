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
import { createDNSRecord } from '@/lib/actions/dns-records';

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

// Test component that integrates modal and records table
function CreateRecordTestComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [records, setRecords] = useState<DNSRecord[]>([
    {
      id: 'existing-1',
      zone_id: 'zone-123',
      type: 'A',
      name: 'www',
      value: '192.168.1.1',
      ttl: 3600,
      priority: null,
      comment: 'Existing record',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  const handleSubmit = async (formData: DNSRecordFormData) => {
    // Call the real createDNSRecord server action - MSW will intercept the fetch
    const newRecord = await createDNSRecord('zone-123', formData);
    
    // Simulate refetch behavior - add new record to state
    setRecords(prev => [...prev, newRecord]);
    setIsModalOpen(false);
  };

  return (
    <div>
      <h1>DNS Records for example.com</h1>
      
      <button onClick={() => setIsModalOpen(true)}>
        Add DNS Record
      </button>

      {records.length > 0 && (
        <DNSRecordsTable
          records={records}
          selectedRecords={selectedRecords}
          onSelectionChange={setSelectedRecords}
          onRecordClick={() => {}}
          zoneName="example.com"
        />
      )}

      <ManageDNSRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        mode="add"
        zoneName="example.com"
        existingRecords={records}
      />
    </div>
  );
}

// Initial records (before creating new one)
const existingRecords: DNSRecord[] = [
  {
    id: 'existing-1',
    zone_id: 'zone-123',
    type: 'A',
    name: 'www',
    value: '192.168.1.1',
    ttl: 3600,
    priority: null,
    comment: 'Existing record',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// New record to be created
const newRecord: DNSRecord = {
  id: 'new-record-1',
  zone_id: 'zone-123',
  type: 'A',
  name: 'api',
  value: '1.2.3.4',
  ttl: 3600,
  priority: null,
  comment: '',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

// MSW server setup
const server = setupServer(
  // POST DNS record endpoint - called by createDNSRecord server action
  http.post('http://localhost:3001/api/dns-records', async ({ request }) => {
    const body = await request.json() as any;
    
    // Return the new record with an ID
    return HttpResponse.json({
      data: {
        id: 'new-record-1',
        zone_id: body.zone_id,
        type: body.type,
        name: body.name,
        value: body.value,
        ttl: body.ttl,
        priority: body.priority || null,
        comment: body.comment || '',
        created_at: new Date().toISOString(),
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

describe('Create DNS Record UI Flow', () => {
  it('allows user to add a DNS record and see it appear in the table', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Step 1: Render the component with existing records
    render(
      <QueryClientProvider client={queryClient}>
        <CreateRecordTestComponent />
      </QueryClientProvider>
    );

    // Verify initial state - existing record is visible
    expect(screen.getByText('DNS Records for example.com')).toBeInTheDocument();
    const existingWwwElements = screen.getAllByText('www');
    expect(existingWwwElements.length).toBeGreaterThan(0);

    // Step 2: Click "Add DNS Record" button
    const addButton = screen.getByText('Add DNS Record');
    await user.click(addButton);

    // Step 3: Verify modal opens (check for the form elements by placeholder)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/@ \(root\) or subdomain/i)).toBeInTheDocument();
    });

    // Step 4: Fill out the form
    // Type is already 'A' by default
    
    // Fill in Name field (using placeholder as Input component may not have proper label association)
    const nameInput = screen.getByPlaceholderText(/@ \(root\) or subdomain/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'api');

    // Fill in Value/IPv4 Address field
    const valueInput = screen.getByPlaceholderText('192.0.2.1');
    await user.clear(valueInput);
    await user.type(valueInput, '1.2.3.4');

    // TTL is already 3600 by default

    // Step 5: Submit the form
    const createButton = screen.getByRole('button', { name: /create record/i });
    
    // Wait for validation to pass (button becomes enabled)
    await waitFor(() => {
      expect(createButton).not.toBeDisabled();
    });

    await user.click(createButton);

    // Step 6: Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create record/i })).not.toBeInTheDocument();
    });

    // Step 7: Verify the new record appears in the table
    await waitFor(() => {
      const apiElements = screen.getAllByText('api');
      expect(apiElements.length).toBeGreaterThan(0);
    });

    // Step 8: Verify the new record's value is displayed
    const ipElements = screen.getAllByText('1.2.3.4');
    expect(ipElements.length).toBeGreaterThan(0);

    // Step 9: Verify both records are now in the table (existing + new)
    const wwwElements = screen.getAllByText('www');
    expect(wwwElements.length).toBeGreaterThan(0);
    const apiRecords = screen.getAllByText('api');
    expect(apiRecords.length).toBeGreaterThan(0);
  });
});
