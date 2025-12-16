'use client';

import { useZones } from '@/lib/hooks/useZones';
import type { Zone } from '@/types/supabase';

interface ZonesContainerProps {
  organizationId: string;
}

// API-returned zone includes computed fields not in the database schema
type ZoneWithCounts = Zone & {
  records_count?: number;
};

/**
 * Container component that fetches zones and displays them
 * This demonstrates the integration between useZones hook and the UI
 */
export function ZonesContainer({ organizationId }: ZonesContainerProps) {
  const { data: zones, isLoading, isError, error } = useZones(organizationId);

  if (isLoading) {
    return (
      <div className="p-4">
        <span data-testid="loading-indicator">Loading zones...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-600">
        <span>Error: {error?.message || 'Failed to load zones'}</span>
      </div>
    );
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="p-4">
        <span>No zones found</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Zones</h2>
      <ul data-testid="zones-list">
        {zones.map((zone: ZoneWithCounts) => (
          <li key={zone.id} className="py-2 border-b">
            <div className="font-semibold">{zone.name}</div>
            <div className="text-sm text-gray-600">{zone.records_count ?? 0} records</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
