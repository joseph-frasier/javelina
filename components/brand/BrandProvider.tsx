'use client';

import { createContext, useContext, useMemo } from 'react';
import { resolveBrandById } from '@/lib/brand/resolve';
import { DEFAULT_BRAND, type BrandConfig } from '@/lib/brand/config';

const BrandContext = createContext<BrandConfig>(DEFAULT_BRAND);

/**
 * The brand for the current request.
 *
 * Outside a BrandProvider this returns Javelina, which is the correct default
 * for every existing surface — the provider is additive, not required.
 */
export function useBrand(): BrandConfig {
  return useContext(BrandContext);
}

/**
 * Takes a brand *id* rather than a config object: only a string crosses the
 * server/client boundary, and the config can gain non-serializable fields
 * later without breaking the payload.
 */
export function BrandProvider({
  brandId,
  children,
}: {
  brandId: string;
  children: React.ReactNode;
}) {
  const brand = useMemo(() => resolveBrandById(brandId), [brandId]);
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}
