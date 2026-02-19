'use client';

import { useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { MapCard } from './MapCard';
import { StatChips } from './StatChips';
import { LocationDrawer } from './LocationDrawer';
import { POPS } from './popData';

export function PopMapSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setIsDrawerOpen(false);
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const selectedPop = selectedId ? POPS.find((p) => p.id === selectedId) : null;

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(249,115,22,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Stat chips */}
        <div className="flex justify-center mb-8">
          <StatChips />
        </div>

        {/* Map card */}
        <MapCard
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* Toolbar below map */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          {/* Selected PoP info */}
          <div className="flex items-center gap-2 min-h-[28px]">
            {selectedPop ? (
              <>
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-sm text-white font-medium">{selectedPop.city}</span>
                <span className="text-sm text-white/40">{selectedPop.country}</span>
                {selectedPop.comingSoon && (
                  <span className="text-xs text-amber-400/90 font-medium">(Coming soon)</span>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  className="ml-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Clear
                </button>
              </>
            ) : (
              <span className="text-sm text-white/30">Click a marker to inspect a PoP</span>
            )}
          </div>

          {/* Open drawer button */}
          <button
            onClick={openDrawer}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 text-white hover:brightness-110
              text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all"
          >
            <MapPin className="w-4 h-4" />
            View all locations
          </button>
        </div>
      </div>

      {/* Location drawer */}
      <LocationDrawer
        isOpen={isDrawerOpen}
        selectedId={selectedId}
        onClose={closeDrawer}
        onSelect={(id) => {
          handleSelect(id);
          setIsDrawerOpen(false);
        }}
      />
    </section>
  );
}
