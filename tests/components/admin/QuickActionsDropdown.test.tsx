import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActionsDropdown, type QuickAction } from '@/components/admin/QuickActionsDropdown';

const makeActions = (onView = vi.fn(), onArchive = vi.fn()): QuickAction[] => [
  { label: 'View Details', icon: <svg />, onClick: onView },
  { label: 'Archive', icon: <svg />, onClick: onArchive, variant: 'danger' },
];

describe('QuickActionsDropdown', () => {
  beforeEach(() => {
    // jsdom has no layout engine; give the trigger a rect so positioning runs.
    Element.prototype.getBoundingClientRect = vi.fn(
      () => ({ top: 100, bottom: 120, left: 200, right: 240, width: 40, height: 20 }) as DOMRect,
    );
  });

  it('does not render the menu until opened', () => {
    render(<QuickActionsDropdown actions={makeActions()} />);
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('renders the menu via a portal outside the component subtree (escapes overflow ancestors)', async () => {
    const { container } = render(<QuickActionsDropdown actions={makeActions()} />);
    await userEvent.click(screen.getByRole('button', { name: /quick actions/i }));

    const item = screen.getByText('View Details');
    expect(item).toBeInTheDocument();
    // The fix: the menu is portaled to document.body, NOT nested inside the
    // component's (overflow-clipped) container. This is what prevents clipping.
    expect(container).not.toContainElement(item);
    expect(document.body).toContainElement(item);
  });

  it('invokes the action and closes the menu on click', async () => {
    const onView = vi.fn();
    render(<QuickActionsDropdown actions={makeActions(onView)} />);
    await userEvent.click(screen.getByRole('button', { name: /quick actions/i }));
    await userEvent.click(screen.getByText('View Details'));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    render(<QuickActionsDropdown actions={makeActions()} />);
    await userEvent.click(screen.getByRole('button', { name: /quick actions/i }));
    expect(screen.getByText('View Details')).toBeInTheDocument();
    // Backdrop is the full-screen fixed layer rendered alongside the menu.
    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });
});
