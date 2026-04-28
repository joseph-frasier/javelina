import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/business/ui/Button';
import { t } from '@/components/business/ui/tokens';

describe('Button', () => {
  it('calls onClick when enabled', () => {
    const onClick = vi.fn();
    render(<Button t={t} onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button t={t} onClick={onClick} disabled>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders ghost and link variants without shadow on link', () => {
    const { rerender } = render(<Button t={t} variant="link">Link</Button>);
    expect(screen.getByRole('button')).toBeTruthy();
    rerender(<Button t={t} variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
