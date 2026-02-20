'use client';

import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { pathGenerator } from './projection';
import { PopMarker } from './PopMarker';
import { POPS } from './popData';
import type { Topology, GeometryCollection } from 'topojson-specification';

// Computed at module scope — deterministic, no render-phase side effects.
const topology = worldData as unknown as Topology<{ countries: GeometryCollection }>;
const countries = feature(topology, topology.objects.countries);

interface WorldMapSvgProps {
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function WorldMapSvg({ selectedId, hoveredId, onSelect, onHover }: WorldMapSvgProps) {
  return (
    <svg
      viewBox="0 0 2000 1000"
      className="w-full h-full"
      aria-label="Global Anycast DNS network map"
      role="img"
    >
      {/* Subtle graticule grid lines */}
      <defs>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="2000" height="1000" fill="url(#grid)" />

      {/* Country paths */}
      {countries.features.map((f, i) => (
        <path
          key={i}
          d={pathGenerator(f) ?? ''}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
      ))}

      {/* PoP markers */}
      {POPS.map((pop) => (
        <PopMarker
          key={pop.id}
          pop={pop}
          isSelected={selectedId === pop.id}
          isHovered={hoveredId === pop.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </svg>
  );
}
