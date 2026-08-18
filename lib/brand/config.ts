/**
 * Brand configuration — two hardcoded brands, no database, no admin UI.
 *
 * A third brand is a config entry here plus a hostname in Vercel; nothing is
 * built to make that self-serve, deliberately (see Spec 1, "Decisions").
 */

export type BrandId = 'javelina' | 'irongrove';

export type SurfaceId =
  | 'website'
  | 'analytics'
  | 'domains'
  | 'dns'
  | 'ssl'
  | 'email'
  | 'billing';

/**
 * 'full'     — the surface behaves normally
 * 'readonly' — the surface renders its simplified, non-editing variant
 * 'hidden'   — no nav entry, and the route returns 404 server-side
 */
export type SurfaceMode = 'full' | 'readonly' | 'hidden';

export interface AccentScale {
  /** Base accent. Buttons, links, active states. */
  500: string;
  /** Hover/pressed. */
  600: string;
  /** Soft tint for light surfaces. */
  50: string;
  /** Stronger soft tint for light surfaces. */
  100: string;
  /** Focus ring. */
  ring: string;
  /**
   * Dark mode uses translucent tints rather than the 50/100 steps — an opaque
   * cream panel on a near-black surface reads as a rendering bug. These are
   * carried explicitly rather than derived so a brand can tune them.
   */
  softDark: string;
  softStrongDark: string;
}

export interface BrandConfig {
  id: BrandId;
  name: string;
  legalName: string;
  /** Exact hostnames, optionally with a port. Matched case-insensitively. */
  hostnames: string[];
  logo: { light: string; dark: string };
  favicon: string;
  accent: AccentScale;
  supportEmail: string;
  marketingUrl: string;
  surfaces: Record<SurfaceId, SurfaceMode>;
}

const JAVELINA: BrandConfig = {
  id: 'javelina',
  name: 'Javelina',
  legalName: 'Irongrove LLC',
  hostnames: ['javelina.cloud', 'app.javelina.cloud', 'localhost:3000'],
  // Real asset paths, as used by components/ui/Logo.tsx.
  logo: {
    light: '/JAVELINA LOGO TRANSPARENT BACKGROUND.png',
    dark: '/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png',
  },
  favicon: '/favicon.ico',
  // Lifted verbatim from the ACCENT constant this replaces, so Javelina's
  // rendered output is unchanged. Do not "tidy" these values.
  accent: {
    500: '#EF7215',
    600: '#D46410',
    50: '#FEF0E5',
    100: '#FDE2CC',
    ring: 'rgba(239,114,21,0.18)',
    softDark: 'rgba(239,114,21,0.12)',
    softStrongDark: 'rgba(239,114,21,0.2)',
  },
  supportEmail: 'support@javelina.cloud',
  marketingUrl: 'https://javelina.cloud',
  surfaces: {
    website: 'full',
    analytics: 'full',
    domains: 'full',
    dns: 'full',
    ssl: 'full',
    email: 'full',
    billing: 'full',
  },
};

const IRONGROVE: BrandConfig = {
  id: 'irongrove',
  name: 'Irongrove',
  legalName: 'Irongrove LLC',
  hostnames: ['app.irongrove.com'],
  // TODO(brand-assets): these files do not exist in public/ yet. Until they
  // do, BrandLogo falls back to a text wordmark rather than a broken image.
  // Source art is in the Irongrove brand kit (irongrove_rising_tree.svg).
  // MUST be added before app.irongrove.com serves real customers.
  logo: { light: '/logos/irongrove-light.svg', dark: '/logos/irongrove-dark.svg' },
  favicon: '/favicon-irongrove.ico',
  // TODO(brand): 500 is the published ember. The 600/50/100/ring steps are
  // derived and should be replaced with the real ramp from
  // irongrove-website-redesign/app/globals.css (--color-ember-*) so the two
  // properties match exactly.
  accent: {
    500: '#FF8D10',
    600: '#E07200',
    50: '#FFF3E6',
    100: '#FFE3C2',
    ring: 'rgba(255,141,16,0.18)',
    softDark: 'rgba(255,141,16,0.12)',
    softStrongDark: 'rgba(255,141,16,0.2)',
  },
  supportEmail: 'support@irongrove.com',
  marketingUrl: 'https://irongrove.com',
  // A Small-package customer bought a website. Domain/DNS/SSL are things
  // Irongrove manages *for* them, so those surfaces are slimmed or removed.
  surfaces: {
    website: 'full',
    analytics: 'full',
    billing: 'full',
    email: 'full',
    domains: 'readonly',
    dns: 'hidden',
    ssl: 'hidden',
  },
};

export const BRANDS: Record<BrandId, BrandConfig> = {
  javelina: JAVELINA,
  irongrove: IRONGROVE,
};

/** Every failure path in the brand layer degrades to this. */
export const DEFAULT_BRAND = JAVELINA;
