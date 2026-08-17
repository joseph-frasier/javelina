import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

// This project's jsdom exposes a localStorage object without working methods,
// so any zustand `persist` store throws on write. Stub it before importing the
// settings store, which persists.
const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();
vi.stubGlobal('localStorage', memoryStorage);

const { useBusinessTheme } = await import('./business-theme-store');
const { useSettingsStore } = await import('./settings-store');
const { BrandProvider } = await import('@/components/brand/BrandProvider');
const { BRANDS } = await import('@/lib/brand/config');

function wrapperFor(brandId: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <BrandProvider brandId={brandId}>{children}</BrandProvider>;
  };
}

describe('useBusinessTheme', () => {
  beforeEach(() => {
    useSettingsStore.getState().setTheme('light');
  });

  it('returns Javelina tokens with no BrandProvider, as every existing surface expects', () => {
    const { result } = renderHook(() => useBusinessTheme());
    expect(result.current.accent).toBe(BRANDS.javelina.accent[500]);
  });

  it('returns Javelina tokens inside a Javelina provider', () => {
    const { result } = renderHook(() => useBusinessTheme(), {
      wrapper: wrapperFor('javelina'),
    });
    expect(result.current.accent).toBe(BRANDS.javelina.accent[500]);
  });

  it('returns Irongrove ember inside an Irongrove provider', () => {
    const { result } = renderHook(() => useBusinessTheme(), {
      wrapper: wrapperFor('irongrove'),
    });
    expect(result.current.accent).toBe(BRANDS.irongrove.accent[500]);
    expect(result.current.accent).toBe('#FF8D10');
  });

  it('keeps non-accent tokens identical across brands', () => {
    const javelina = renderHook(() => useBusinessTheme(), {
      wrapper: wrapperFor('javelina'),
    });
    const irongrove = renderHook(() => useBusinessTheme(), {
      wrapper: wrapperFor('irongrove'),
    });
    expect(irongrove.result.current.bg).toBe(javelina.result.current.bg);
    expect(irongrove.result.current.surface).toBe(javelina.result.current.surface);
    expect(irongrove.result.current.text).toBe(javelina.result.current.text);
  });

  it('applies the brand accent in dark mode too', () => {
    useSettingsStore.getState().setTheme('dark');
    const { result } = renderHook(() => useBusinessTheme(), {
      wrapper: wrapperFor('irongrove'),
    });
    expect(result.current.accent).toBe(BRANDS.irongrove.accent[500]);
    expect(result.current.bg).toBe('#0b0d10');
    // Dark mode must keep translucent soft tints, per brand.
    expect(result.current.accentSoft).toBe(BRANDS.irongrove.accent.softDark);
  });
});
