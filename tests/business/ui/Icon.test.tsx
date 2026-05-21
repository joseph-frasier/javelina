import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '@/components/business/ui/Icon';

describe('Icon', () => {
  it('renders the named SVG shape', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('16');
  });

  it('falls back silently for unknown names', () => {
    const { container } = render(<Icon name={'nope' as never} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
