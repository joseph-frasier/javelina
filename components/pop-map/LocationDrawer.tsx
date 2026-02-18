'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { POPS, REGION_LABELS } from './popData';
import type { Region } from './popData';

const REGION_ORDER: Region[] = ['NA', 'SA', 'EU', 'ME_AF', 'APAC'];

interface LocationDrawerProps {
  isOpen: boolean;
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function LocationDrawer({ isOpen, selectedId, onClose, onSelect }: LocationDrawerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus search input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ESC key closes the drawer
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const normalised = query.toLowerCase().trim();
  const filtered = normalised
    ? POPS.filter(
        (p) =>
          p.city.toLowerCase().includes(normalised) ||
          p.country.toLowerCase().includes(normalised)
      )
    : POPS;

  const grouped = REGION_ORDER.reduce<Record<Region, typeof POPS>>(
    (acc, r) => {
      acc[r] = filtered.filter((p) => p.region === r);
      return acc;
    },
    { NA: [], SA: [], EU: [], ME_AF: [], APAC: [] }
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="PoP locations list"
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-80 bg-[#131521] border-l border-white/10 z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">PoP Locations</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-white/40 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search city or country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-white/30 hover:text-white/60 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Location list */}
        <div className="flex-1 overflow-y-auto">
          {REGION_ORDER.map((region) => {
            const pops = grouped[region];
            if (pops.length === 0) return null;
            return (
              <div key={region}>
                <div className="px-4 py-2 bg-white/[0.03] sticky top-0">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {REGION_LABELS[region]}
                  </span>
                </div>
                {pops.map((pop) => (
                  <button
                    key={pop.id}
                    onClick={() => onSelect(pop.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors
                      ${
                        selectedId === pop.id
                          ? 'bg-orange-500/10 border-l-2 border-orange-500'
                          : 'hover:bg-white/5 border-l-2 border-transparent'
                      }`}
                  >
                    {/* Status dot */}
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-white font-medium truncate">{pop.city}</span>
                      <span className="text-xs text-white/40 truncate">{pop.country}</span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Search className="w-8 h-8 text-white/20 mb-3" />
              <p className="text-sm text-white/40">No locations match &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Footer count */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/30 text-center">
            {filtered.length} of {POPS.length} locations
          </p>
        </div>
      </div>
    </>
  );
}
