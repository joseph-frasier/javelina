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
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-4">
            Network Infrastructure
          </p>
          <h1 className="font-condensed font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-tight mb-6">
            Global Anycast
            <br />
            <span className="text-orange-400">DNS Network</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            30 Points of Presence across 6 continents. Every query resolved at the edge, closer to
            your users, faster than ever.
          </p>
        </div>
      </section>

      {/* ====== MAP SECTION ====== */}
      <PopMapSection />

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
            Sign up and your DNS zones are automatically served from all 30 PoPs, no configuration
            required.
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
