import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationChecklist } from '@/components/dns/VerificationChecklist';
import gsap from 'gsap';

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

      if (key === 'width') {
        el.style.width = typeof value === 'number' ? `${value}px` : String(value);
        return;
      }

      if (key === 'maxWidth') {
        el.style.maxWidth = typeof value === 'number' ? `${value}px` : String(value);
        return;
      }

      if (key === 'opacity') {
        el.style.opacity = String(value);
        return;
      }

      if (key === 'clearProps') {
        if (String(value).includes('width') || String(value).includes('maxWidth')) {
          el.style.removeProperty('width');
          el.style.removeProperty('max-width');
        }
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
  const mockMatchMedia = (mobile = false, reducedMotion = false) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        const isReducedQuery = query.includes('prefers-reduced-motion');
        const isMobileQuery = query.includes('max-width: 639px');
        const matches = isReducedQuery ? reducedMotion : isMobileQuery ? mobile : false;

        return {
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }),
    });
  };

  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false, false);
    vi.clearAllMocks();
  });

  it('renders expanded by default and can minimize/expand while persisting state', async () => {
    const user = userEvent.setup();

    render(<VerificationChecklist nameservers={nameservers} storageKey={storageKey} />);

    const containerEl = screen.getByTestId('verification-alert-container');
    const minimizeButton = await screen.findByRole('button', { name: 'Minimize' });
    expect(minimizeButton).toBeInTheDocument();
    expect(screen.getByText('Nameservers for Javelina')).toBeInTheDocument();
    expect(containerEl).toHaveClass('w-full');

    const detailsId = minimizeButton.getAttribute('aria-controls');
    expect(detailsId).toBeTruthy();
    const detailsEl = document.getElementById(detailsId!);
    expect(detailsEl).toHaveAttribute('aria-hidden', 'false');

    await user.click(minimizeButton);

    const expandButton = await screen.findByRole('button', { name: 'Expand' });
    expect(expandButton).toBeInTheDocument();
    expect(detailsEl).toHaveAttribute('aria-hidden', 'true');
    expect(localStorage.getItem(storageKey)).toBe('true');
    expect(containerEl).toHaveClass('inline-block');
    expect(containerEl).toHaveClass('w-fit');

    await user.click(expandButton);

    await screen.findByRole('button', { name: 'Minimize' });
    expect(detailsEl).toHaveAttribute('aria-hidden', 'false');
    expect(localStorage.getItem(storageKey)).toBe('false');

    const gsapToMock = vi.mocked(gsap.to);
    const hasWidthTween = gsapToMock.mock.calls.some(([, vars]) => {
      const tweenVars = vars as Record<string, unknown>;
      return tweenVars.maxWidth === '100%';
    });
    expect(hasWidthTween).toBe(true);
  });

  it('restores minimized state from localStorage for the same storage key', async () => {
    localStorage.setItem(storageKey, 'true');

    render(<VerificationChecklist nameservers={nameservers} storageKey={storageKey} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    });
  });

  it('keeps minimized mode full width on mobile', async () => {
    mockMatchMedia(true, false);
    localStorage.setItem(storageKey, 'true');

    render(<VerificationChecklist nameservers={nameservers} storageKey={storageKey} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    });

    const containerEl = screen.getByTestId('verification-alert-container');
    expect(containerEl).toHaveClass('w-full');
    expect(containerEl).not.toHaveClass('inline-block');
    expect(containerEl).not.toHaveClass('w-fit');
  });
});
