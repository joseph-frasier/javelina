import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZonesList } from './ZonesList';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the Card component to avoid complex dependencies
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, title, description }: { children: React.ReactNode; title: string; description: string }) => (
    <div data-testid="card">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

// Mock Button component
vi.mock('@/components/ui/Button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock TagBadge component
vi.mock('@/components/ui/TagBadge', () => ({
  TagBadge: () => null,
}));

describe('ZonesList', () => {
  it('renders zone names when zones are provided', () => {
    // Arrange: Mock zone data
    const mockZones = [
      { 
        id: '1', 
        name: 'example.com', 
        organization_id: 'org-123', 
        records_count: 5 
      },
      { 
        id: '2', 
        name: 'test.io', 
        organization_id: 'org-123', 
        records_count: 3 
      },
      { 
        id: '3', 
        name: 'myapp.dev', 
        organization_id: 'org-123', 
        records_count: 8 
      },
    ];

    // Act: Render the component
    render(
      <ZonesList 
        organizationId="org-123" 
        zones={mockZones}
      />
    );

    // Assert: Zone names should be visible on screen
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('test.io')).toBeInTheDocument();
    expect(screen.getByText('myapp.dev')).toBeInTheDocument();

    // Assert: Record counts should be visible
    expect(screen.getByText('5 records')).toBeInTheDocument();
    expect(screen.getByText('3 records')).toBeInTheDocument();
    expect(screen.getByText('8 records')).toBeInTheDocument();

    // Assert: Card title should say "Zones"
    expect(screen.getByText('Zones')).toBeInTheDocument();

    // Assert: Description should show "All DNS zones" when no filters
    expect(screen.getByText('All DNS zones')).toBeInTheDocument();
  });
});
