import { geoNaturalEarth1, geoPath } from 'd3-geo';

// Defined at module scope — deterministic, no hydration mismatch, shared singleton.
// viewBox: 0 0 2000 1000
const projection = geoNaturalEarth1()
  .scale(320)
  .translate([1000, 500]);

export const pathGenerator = geoPath().projection(projection);

/**
 * Convert longitude/latitude to SVG [x, y] coordinates.
 * Both WorldMapSvg and PopMarker must use this to prevent drift.
 */
export const lonLatToSvg = (lon: number, lat: number): [number, number] => {
  const result = projection([lon, lat]);
  return result ?? [0, 0];
};
