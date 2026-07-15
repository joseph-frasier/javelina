import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OrgSelect from '@/components/domains/OrgSelect';

const orgs = [
  { id: 'o1', name: 'Acme', role: 'Admin' as const },
  { id: 'o2', name: 'Globex', role: 'Viewer' as const },
];

describe('OrgSelect', () => {
  it('renders an option per org and reports changes', () => {
    const onChange = vi.fn();
    render(<OrgSelect value="o1" onChange={onChange} orgs={orgs} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'o2' } });
    expect(onChange).toHaveBeenCalledWith('o2');
  });

  it('renders nothing for fewer than two orgs', () => {
    const { container } = render(<OrgSelect value="o1" onChange={() => {}} orgs={[orgs[0]]} />);
    expect(container.querySelector('select')).toBeNull();
  });
});
