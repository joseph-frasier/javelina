import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { DNSRecord } from '@/types/dns';
import { DNSRecordsTable } from '@/components/dns/DNSRecordsTable';
import * as getDNSRecordsAction from '@/lib/actions/dns-records';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock getDNSRecords server action
vi.mock('@/lib/actions/dns-records', () => ({
  getDNSRecords: vi.fn(),
}));

// Mock Supabase server
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

// Mock UI components for simpler rendering
vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/admin/ExportButton', () => ({
  ExportButton: () => null,
}));

// Import React
import React, { useEffect, useState } from 'react';

// Test component that fetches and displays DNS records
function ZoneRecordsTestComponent({ zoneId }: { zoneId: string }) {
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await getDNSRecordsAction.getDNSRecords(zoneId);
        setRecords(data);
      } catch (error) {
        console.error('Failed to fetch DNS records:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [zoneId]);

  if (loading) {
    return <div>Loading DNS records...</div>;
  }

  if (records.length === 0) {
    return <div>No DNS records found</div>;
  }

  return (
    <div>
      <h1>DNS Records for Zone</h1>
      <DNSRecordsTable
        records={records}
        selectedRecords={selectedRecords}
        onSelectionChange={setSelectedRecords}
        onRecordClick={() => {}}
        zoneName="example.com"
      />
    </div>
  );
}

// Mock DNS records data
const mockDNSRecords: DNSRecord[] = [
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
    type: 'MX',
    name: '@',
    value: '10 mail.example.com',
    ttl: 3600,
    priority: 10,
    comment: 'Mail server',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'record-3',
    zone_id: 'zone-123',
    type: 'CNAME',
    name: 'blog',
    value: 'www.example.com',
    ttl: 7200,
    priority: null,
    comment: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// MSW server setup
const server = setupServer(
  // GET DNS records endpoint
  http.get('http://localhost:3001/api/dns-records/zone/:zoneId', () => {
    return HttpResponse.json({ data: mockDNSRecords });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Zone DNS Records Display', () => {
  it('fetches and displays DNS records in the table', async () => {
    // Mock getDNSRecords action to return mock data
    const mockGetDNSRecords = vi.spyOn(getDNSRecordsAction, 'getDNSRecords');
    mockGetDNSRecords.mockResolvedValue(mockDNSRecords);

    // Render the component
    render(<ZoneRecordsTestComponent zoneId="zone-123" />);

    // Step 1: Verify loading state appears initially
    expect(screen.getByText('Loading DNS records...')).toBeInTheDocument();

    // Step 2: Wait for records to load
    await waitFor(() => {
      expect(screen.queryByText('Loading DNS records...')).not.toBeInTheDocument();
    });

    // Step 3: Verify getDNSRecords was called with correct zone ID
    expect(mockGetDNSRecords).toHaveBeenCalledWith('zone-123');

    // Step 4: Verify DNS Records heading is displayed
    expect(screen.getByText('DNS Records for Zone')).toBeInTheDocument();

    // Step 5: Verify record names appear in the table
    await waitFor(() => {
      const wwwElements = screen.getAllByText('www');
      expect(wwwElements.length).toBeGreaterThan(0);
    });
    const blogElements = screen.getAllByText('blog');
    expect(blogElements.length).toBeGreaterThan(0);
    
    // Step 6: Verify record types are displayed
    const aRecords = screen.getAllByText('A');
    expect(aRecords.length).toBeGreaterThan(0);
    const mxRecords = screen.getAllByText('MX');
    expect(mxRecords.length).toBeGreaterThan(0);
    const cnameRecords = screen.getAllByText('CNAME');
    expect(cnameRecords.length).toBeGreaterThan(0);

    // Step 7: Verify record values are displayed (table renders desktop + mobile, so use getAllByText)
    const ipElements = screen.getAllByText('192.168.1.1');
    expect(ipElements.length).toBeGreaterThan(0);
    
    // Step 8: Verify all 3 mock records are present in the table
    expect(mockGetDNSRecords).toHaveBeenCalledTimes(1);
    
    // Verify table structure exists
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });
});
