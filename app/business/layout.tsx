import type { ReactNode } from 'react';
import { getBrand } from '@/lib/brand/server';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { BusinessShell } from '@/components/business/BusinessShell';

/**
 * Server component so the brand can be resolved from the request before
 * anything renders — no client-side host sniffing, so no flash of the wrong
 * accent. The chrome itself lives in BusinessShell, which stays a client
 * component because it needs the theme hook.
 *
 * This segment is already dynamic (auth-gated), so reading the request header
 * here costs nothing. The root layout deliberately does NOT do this.
 */
export default async function BusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  const brand = await getBrand();

  return (
    <BrandProvider brandId={brand.id}>
      <BusinessShell>{children}</BusinessShell>
    </BrandProvider>
  );
}
