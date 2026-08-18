import type { BrandConfig, SurfaceId, SurfaceMode } from './config';

const SURFACE_IDS: SurfaceId[] = [
  'website',
  'analytics',
  'domains',
  'dns',
  'ssl',
  'email',
  'billing',
];

const SURFACE_MODES: SurfaceMode[] = ['full', 'readonly', 'hidden'];

export type SurfaceOverrides = Partial<Record<SurfaceId, SurfaceMode>>;

function isSurfaceId(value: unknown): value is SurfaceId {
  return typeof value === 'string' && SURFACE_IDS.includes(value as SurfaceId);
}

function isSurfaceMode(value: unknown): value is SurfaceMode {
  return typeof value === 'string' && SURFACE_MODES.includes(value as SurfaceMode);
}

/**
 * Validate the `organizations.surface_overrides` jsonb blob.
 *
 * These are written by hand, backend-side, off the back of a support
 * conversation — there is no UI and no schema enforcing them. A typo must
 * fail closed (drop the entry, fall back to the brand default) rather than
 * silently granting access to a surface the brand hides.
 */
export function parseSurfaceOverrides(raw: unknown): SurfaceOverrides | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

  const parsed: SurfaceOverrides = {};
  for (const [surface, mode] of Object.entries(raw)) {
    if (isSurfaceId(surface) && isSurfaceMode(mode)) {
      parsed[surface] = mode;
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

/**
 * The mode actually in force: `orgOverride ?? brandDefault`.
 *
 * Deliberately separate from the plan-limits / entitlement machinery.
 * Entitlements describe what a customer bought; overrides describe what a
 * support conversation concluded. Conflating them makes the override look
 * purchasable.
 */
export function effectiveSurfaceMode(
  brand: BrandConfig,
  surface: SurfaceId,
  overrides: SurfaceOverrides | null | undefined
): SurfaceMode {
  return overrides?.[surface] ?? brand.surfaces[surface];
}

/**
 * True only for 'hidden'. A 'readonly' surface still renders — it must not
 * 404, it renders its simplified variant.
 */
export function isSurfaceHidden(
  brand: BrandConfig,
  surface: SurfaceId,
  overrides: SurfaceOverrides | null | undefined
): boolean {
  return effectiveSurfaceMode(brand, surface, overrides) === 'hidden';
}

/** Surfaces that should appear in navigation, in canonical order. */
export function visibleSurfaces(
  brand: BrandConfig,
  overrides: SurfaceOverrides | null | undefined
): SurfaceId[] {
  return SURFACE_IDS.filter(
    (surface) => !isSurfaceHidden(brand, surface, overrides)
  );
}
