'use client';

import { lonLatToSvg } from './projection';
import type { PoP } from './popData';

interface PopMarkerProps {
  pop: PoP;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function PopMarker({ pop, isSelected, isHovered, onSelect, onHover }: PopMarkerProps) {
  const [x, y] = lonLatToSvg(pop.lon, pop.lat);

  const isActive = isSelected || isHovered;
  const dotRadius = isActive ? 7 : 5;
  const dotColor = isSelected ? '#f97316' : isHovered ? '#fb923c' : '#f97316';
  const pulseColor = isSelected ? '#f97316' : '#fb923c';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(pop.id);
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelect(pop.id)}
      onMouseEnter={() => onHover(pop.id)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${pop.city}, ${pop.country}`}
      aria-pressed={isSelected}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {/* Pulse ring — CSS animation keeps it off the JS thread */}
      {isActive && (
        <circle
          r={dotRadius}
          fill="none"
          stroke={pulseColor}
          strokeWidth="1.5"
          opacity="0.8"
          style={{
            animation: 'popPulse 1.8s ease-out infinite',
            transformOrigin: '0 0',
          }}
        />
      )}

      {/* Always-on faint halo */}
      <circle r={dotRadius + 3} fill={dotColor} opacity="0.12" />

      {/* Core dot */}
      <circle
        r={dotRadius}
        fill={dotColor}
        style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
      />

      {/* Focus ring for keyboard navigation */}
      <circle
        r={dotRadius + 6}
        fill="none"
        stroke="#f97316"
        strokeWidth="1.5"
        opacity={isSelected ? 0.6 : 0}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
