import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryRow } from '@/components/business/wizard/SummaryRow';
import { AestheticCard } from '@/components/business/wizard/AestheticCard';
import { t } from '@/components/business/ui/tokens';

describe('SummaryRow', () => {
  it('renders label and value', () => {
    render(<SummaryRow t={t} label="Plan" value="Starter" />);
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Starter')).toBeTruthy();
  });
});

describe('AestheticCard', () => {
  it('fires onClick with its id', () => {
    const onClick = vi.fn();
    render(
      <AestheticCard
        t={t}
        id="bold"
        selected="simple"
        onClick={onClick}
        title="Bold"
        description="desc"
        swatches={['#000']}
        fontLabel="Inter"
        sample={{ bg: '#fff', fg: '#000', font: 'Inter', weight: 700, size: 20, tracking: '0', text: 'Hi' }}
      />
    );
    fireEvent.click(screen.getByText('Bold'));
    expect(onClick).toHaveBeenCalledWith('bold');
  });
});
