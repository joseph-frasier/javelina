import { notFound } from 'next/navigation';
import { getBrand } from './server';
import { isSurfaceHidden, type SurfaceOverrides } from './surfaces';
import type { SurfaceId } from './config';

/**
 * Server-side gate for a branded surface. Call from a segment layout.
 *
 * Hiding the nav entry alone is security by obscurity: a customer who types
 * /business/<org>/dns would otherwise land in a live DNS record editor for a
 * domain they are not meant to be managing. This is the half that enforces.
 *
 * 404 rather than 403 on purpose — a surface the brand hides should not
 * advertise that it exists.
 */
export async function guardSurface(
  surface: SurfaceId,
  overrides: SurfaceOverrides | null = null
): Promise<void> {
  const brand = await getBrand();
  if (isSurfaceHidden(brand, surface, overrides)) {
    notFound();
  }
}
