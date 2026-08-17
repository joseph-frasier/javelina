import { headers } from 'next/headers';
import { resolveBrandById } from './resolve';
import type { BrandConfig } from './config';

/**
 * Read the brand for the current request, as stamped by middleware.
 *
 * Server components and layouts only. Calling this makes the calling segment
 * dynamic, so do NOT call it from app/layout.tsx — that would opt every route,
 * including the static marketing pages, out of static rendering. Call it from
 * the segments that are already dynamic (auth-gated dashboards, the funnel).
 */
export async function getBrand(): Promise<BrandConfig> {
  const requestHeaders = await headers();
  return resolveBrandById(requestHeaders.get('x-brand'));
}
