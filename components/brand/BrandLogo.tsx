'use client';

import { Logo } from '@/components/ui/Logo';
import { useBrand } from '@/components/brand/BrandProvider';
import { FONT } from '@/components/business/ui/tokens';

/**
 * Brand-aware logo.
 *
 * Javelina delegates to the existing Logo component so its bespoke theme
 * detection and asset handling are untouched — this is a pure pass-through
 * for the only brand currently in production.
 *
 * Other brands render a text wordmark until their assets exist in public/.
 * A missing image is a worse failure than a wordmark: it renders as a broken
 * icon and nobody notices until a customer screenshots it. See
 * TODO(brand-assets) in lib/brand/config.ts.
 */
export function BrandLogo({
  width = 120,
  height = 40,
}: {
  width?: number;
  height?: number;
}) {
  const brand = useBrand();

  if (brand.id === 'javelina') {
    return <Logo width={width} height={height} />;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height,
        fontFamily: FONT,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: brand.accent[500],
      }}
    >
      {brand.name}
    </span>
  );
}

export default BrandLogo;
