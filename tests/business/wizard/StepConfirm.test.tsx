// tests/business/wizard/StepConfirm.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepConfirm } from '@/components/business/wizard/StepConfirm';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data: BusinessIntakeData = {
  orgId: 'o1',
  planCode: 'business_starter',
  currentStep: 4,
  dns: { mode: 'jbp' },
  website: {
    bizName: 'Acme', bizType: 'Bakery', industry: 'Food & Beverage',
    tagline: '', description: '', services: '',
    pages: ['Home', 'Services', 'About', 'Contact'],
    logoName: null, photoCount: 0,
    tone: 'Friendly', aesthetic: 'simple', letUsWrite: true,
  },
  domain: { mode: 'connect', domain: 'acme.com' },
  contact: {
    firstName: 'Pat', lastName: 'Lee',
    email: 'pat@acme.com', phone: '',
    address: '', city: '', state: '', zip: '', whois: true,
  },
  completedAt: null,
};

describe('StepConfirm', () => {
  it('renders summary rows including plan-specific deliverables', () => {
    render(<StepConfirm t={t} data={data} />);
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Connect · acme.com')).toBeTruthy();
    // Business Starter plan features should appear
    expect(screen.getByText('Javelina DNS')).toBeTruthy();
  });
});
