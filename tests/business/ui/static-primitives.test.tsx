import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { t } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';

describe('Card', () => {
  it('renders children', () => {
    render(<Card t={t}><span>inside</span></Card>);
    expect(screen.getByText('inside')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('renders label and a dot when requested', () => {
    const { container } = render(<Badge t={t} tone="success" dot>Live</Badge>);
    expect(screen.getByText('Live')).toBeTruthy();
    expect(container.querySelectorAll('span').length).toBeGreaterThanOrEqual(2);
  });
});

describe('StepHeader', () => {
  it('renders eyebrow, title, and subtitle', () => {
    render(<StepHeader t={t} eyebrow="Step 1 of 5" title="Hello" subtitle="Sub" />);
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('Sub')).toBeTruthy();
  });
});

describe('FieldLabel', () => {
  it('renders optional marker when optional', () => {
    render(<FieldLabel t={t} optional>Business name</FieldLabel>);
    expect(screen.getByText('optional')).toBeTruthy();
  });
});
