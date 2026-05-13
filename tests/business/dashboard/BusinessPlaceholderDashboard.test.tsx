import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data: BusinessIntakeData = {
  orgId: 'o1',
  planCode: 'business_starter',
  currentStep: 4,
  dns: { mode: 'jbp' },
  website: {
    bizName: 'Acme', bizType: '', industry: '',
    tagline: '', description: '', services: '',
    pages: ['Home', 'Services', 'About', 'Contact'],
    logo: null, photos: [],
    tone: 'Friendly', aesthetic: 'simple', letUsWrite: true,
  },
  domain: { mode: 'connect', domain: 'acme.com' },
  contact: {
    firstName: 'Pat', lastName: 'Lee',
    email: 'pat@acme.com', phone: '',
    address: '', city: '', state: '', zip: '', whois: true,
  },
  completedAt: '2026-04-22T00:00:00.000Z',
};

describe('BusinessPlaceholderDashboard', () => {
  it('renders status, submitted data, and next steps', () => {
    render(<BusinessPlaceholderDashboard data={data} />);
    expect(screen.getByText(/Acme/)).toBeTruthy();
    expect(screen.getAllByText(/acme\.com/)).toBeTruthy();
    expect(screen.getByText(/What happens next/i)).toBeTruthy();
  });
});
