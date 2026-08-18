import type { ReactNode } from 'react';
import { guardSurface } from '@/lib/brand/guard';

/**
 * Server-side surface guard for /dns.
 *
 * Renders nothing itself — its only job is to 404 before the client page
 * below it mounts, for brands where this surface is hidden. Hiding the nav
 * entry alone is security by obscurity; this is the half that enforces.
 *
 * TODO(surface-overrides): pass the org's surface_overrides once the backend
 * exposes them. Until then this enforces brand defaults only, which is the
 * strict direction — an override can only ever open a surface, never close
 * one that was already open.
 */
export default async function DnsSurfaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await guardSurface('dns');
  return <>{children}</>;
}
