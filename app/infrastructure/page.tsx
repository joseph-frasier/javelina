'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PopMapSection } from '@/components/pop-map/PopMapSection';
import { useAuthStore } from '@/lib/auth-store';

export default function InfrastructurePage() {
  const [scrolled, setScrolled] = useState(false);
  const { signup } = useAuthStore();

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
  }, []);

  // Navbar glassmorphism on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0f18] overflow-x-hidden">
      {/* ====== NAVBAR ====== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0d0f18]/90 backdrop-blur-md border-b border-white/10 shadow-sm shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/">
              <Image
                src="/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png"
                alt="Javelina"
                width={130}
                height={35}
                priority
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-sm font-medium text-gray-400 hover:text-orange-400 transition-colors"
              >
                ← Back to Home
              </Link>
              <button onClick={signup} className="inline-flex items-center bg-orange-500 text-white hover:brightness-110 rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all group">
                Get started
                <svg
                  className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ====== PAGE HEADER ====== */}
      <section className="relative pt-32 pb-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-7xl mx-auto text-center relative">
          {/* Infrastructure pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/50 bg-white/5 mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
            </span>
            <span className="text-xs font-semibold text-white uppercase tracking-widest">
              Infrastructure
            </span>
          </div>
          <h1 className="font-condensed font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-tight mb-6">
            Global Anycast <span className="text-orange-400">DNS Network</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Javelina DNS runs an Anycast network where a single IP address is announced from 30 Points of Presence across 6 continents and 19 countries. BGP routes each query to the nearest available node for local resolution and routing-layer failover typically within seconds.
          </p>
        </div>
      </section>

      {/* ====== MAP SECTION ====== */}
      <PopMapSection />

      {/* ====== HOW ANYCAST ROUTING WORKS ====== */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-condensed font-black text-2xl sm:text-3xl text-white tracking-tight text-center mb-10">
            How Anycast <span className="text-orange-400">routing works</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group rounded-2xl p-6 bg-white/5 border border-white/20 hover:border-orange/50 hover:bg-white/[0.08] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">BGP Path Selection</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                A single IP address is announced from all 30 locations via BGP. The internet&apos;s routing infrastructure automatically selects the shortest network path.
              </p>
            </div>
            <div className="group rounded-2xl p-6 bg-white/5 border border-white/20 hover:border-orange/50 hover:bg-white/[0.08] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Local Resolution</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                DNS queries are answered by the geographically nearest node. No cross-continent round trips, no backhauling. Just local resolution with sub-40ms latency.
              </p>
            </div>
            <div className="group rounded-2xl p-6 bg-white/5 border border-white/20 hover:border-orange/50 hover:bg-white/[0.08] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Automatic Failover</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                If a node goes down, BGP reroutes traffic to the next-closest node typically within seconds. No TTL-dependent delays, no manual intervention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== BOTTOM CTA ====== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(249,115,22,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="font-condensed font-black text-3xl sm:text-4xl text-white tracking-tight mb-4">
            Ready to use the <span className="text-orange-400">network</span>?
          </h2>
          <p className="text-gray-400 mb-8 font-light">
            Every zone is served from all 30 PoPs with Anycast routing, automatic failover, and sub-40ms resolution with no configuration required.
          </p>
          <button onClick={signup} className="inline-flex items-center bg-orange-500 text-white hover:brightness-110 rounded-full px-8 py-4 text-base font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all group">
            Get started
            <svg
              className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image
            src="/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png"
            alt="Javelina"
            width={100}
            height={28}
          />
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Javelina. All rights reserved.
          </p>
          <Link href="/" className="text-xs text-gray-500 hover:text-orange-400 transition-colors">
            Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
