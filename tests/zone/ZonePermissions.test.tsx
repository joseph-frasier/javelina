import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { canDeleteZone } from '@/lib/permissions';
import type { RBACRole } from '@/lib/auth-store';

// Simple test component that demonstrates role-based UI permissions
// This represents how the ZoneDetailClient should check permissions before showing destructive actions
function ZoneActionsTestComponent({ userRole }: { userRole: RBACRole }) {
  const canDelete = canDeleteZone(userRole);

  return (
    <div>
      <h1>Zone Actions</h1>
      <div>
        {/* Edit button - all roles can see (editors can edit) */}
        <button>Edit Zone</button>
        
        {/* Export button - all roles can see (read-only) */}
        <button>Export Zone</button>

        {/* Delete button - only visible to roles with delete permissions */}
        {canDelete && (
          <button data-testid="delete-zone-button">Delete Zone</button>
        )}
      </div>
    </div>
  );
}

describe('Zone Permissions - Role-Based UI', () => {
  it('hides Delete Zone button for Viewer role and shows it for Admin role', () => {
    // Step 1: Render component with Viewer role
    const { rerender } = render(<ZoneActionsTestComponent userRole="Viewer" />);

    // Step 2: Verify Viewer cannot see Delete Zone button
    expect(screen.queryByTestId('delete-zone-button')).not.toBeInTheDocument();
    
    // Verify Viewer can still see non-destructive actions
    expect(screen.getByText('Edit Zone')).toBeInTheDocument();
    expect(screen.getByText('Export Zone')).toBeInTheDocument();

    // Step 3: Re-render with Admin role
    rerender(<ZoneActionsTestComponent userRole="Admin" />);

    // Step 4: Verify Admin CAN see Delete Zone button
    expect(screen.getByTestId('delete-zone-button')).toBeInTheDocument();
    expect(screen.getByText('Delete Zone')).toBeInTheDocument();

    // Verify Admin can also see other actions
    expect(screen.getByText('Edit Zone')).toBeInTheDocument();
    expect(screen.getByText('Export Zone')).toBeInTheDocument();
  });
});
