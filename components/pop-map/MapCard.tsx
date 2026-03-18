'use client';

import { WorldMapSvg } from './WorldMapSvg';
import { POPS } from './popData';

interface MapCardProps {
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function MapCard({ selectedId, hoveredId, onSelect, onHover }: MapCardProps) {
  const activePoPCount = POPS.filter((pop) => !pop.comingSoon).length;

  return (
    <div className="relative bg-[#131521] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* Orange glowing dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          </span>
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
            Live Network Status
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Pulsing green indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-xs text-green-400 font-semibold">{activePoPCount} PoPs active</span>
        </div>
      </div>

      {/* Map area */}
      <div className="relative w-full" style={{ aspectRatio: '2 / 1' }}>
        {/* Subtle vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 60%, rgba(13,15,24,0.6) 100%)',
          }}
        />
        <WorldMapSvg
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={onHover}
        />
      </div>
    </div>
  );
}
