import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationChecklist } from '@/components/dns/VerificationChecklist';

vi.mock('gsap', () => {
  const applyStyles = (target: Element, vars: Record<string, unknown>) => {
    const el = target as HTMLElement;
    if (!el || !vars) return;

    Object.entries(vars).forEach(([key, value]) => {
      if (key === 'duration' || key === 'ease' || key === 'onComplete') {
        return;
      }

      if (key === 'height') {
        el.style.height = value === 'auto' ? 'auto' : `${value}px`;
        return;
      }

      if (key === 'opacity') {
        el.style.opacity = String(value);
        return;
      }

      if (key === 'y') {
        el.style.transform = `translateY(${value}px)`;
      }
    });

    if (typeof vars.onComplete === 'function') {
      vars.onComplete();
    }
  };

  return {
    default: {
      set: vi.fn((target: Element, vars: Record<string, unknown>) => applyStyles(target, vars)),
      to: vi.fn((target: Element, vars: Record<string, unknown>) => applyStyles(target, vars)),
      fromTo: vi.fn(
        (target: Element, _fromVars: Record<string, unknown>, toVars: Record<string, unknown>) =>
          applyStyles(target, toVars)
      ),
      killTweensOf: vi.fn(),
    },
  };
});

describe('VerificationChecklist', () => {
  const nameservers = ['ns1.javelina.cc', 'ns2.javelina.me'];
  const storageKey = 'zone-test-nameserver-verification-minimized';

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders expanded by default and can minimize/expand while persisting state', async () => {
    const user = userEvent.setup();

    render(<VerificationChecklist nameservers={nameservers} storageKey={storageKey} />);

    const minimizeButton = await screen.findByRole('button', { name: 'Minimize' });
    expect(minimizeButton).toBeInTheDocument();
    expect(screen.getByText('Nameservers for Javelina')).toBeInTheDocument();

    const detailsId = minimizeButton.getAttribute('aria-controls');
    expect(detailsId).toBeTruthy();
    const detailsEl = document.getElementById(detailsId!);
    expect(detailsEl).toHaveAttribute('aria-hidden', 'false');

    await user.click(minimizeButton);

    const expandButton = await screen.findByRole('button', { name: 'Expand' });
    expect(expandButton).toBeInTheDocument();
    expect(detailsEl).toHaveAttribute('aria-hidden', 'true');
    expect(localStorage.getItem(storageKey)).toBe('true');

    await user.click(expandButton);

    await screen.findByRole('button', { name: 'Minimize' });
    expect(detailsEl).toHaveAttribute('aria-hidden', 'false');
    expect(localStorage.getItem(storageKey)).toBe('false');
  });

  it('restores minimized state from localStorage for the same storage key', async () => {
    localStorage.setItem(storageKey, 'true');

    render(<VerificationChecklist nameservers={nameservers} storageKey={storageKey} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    });
  });
});
