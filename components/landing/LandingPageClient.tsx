'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState, useRef } from 'react';
import { WelcomeGuidance } from '@/components/dashboard/WelcomeGuidance';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Logo } from '@/components/ui/Logo';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPageClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login, signup } = useAuthStore();
  const organizations = user?.organizations || [];
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const landingRef = useRef<HTMLDivElement>(null);

  // Scroll listener for navbar glassmorphism effect
  useEffect(() => {
    if (isAuthenticated || user) return;
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAuthenticated, user]);

  // GSAP scroll-triggered animations for the landing page
  useGSAP(() => {
    if (!landingRef.current) return;

    // Hero entrance
    gsap.from('.hero-content > *', {
      opacity: 0, y: 40, duration: 0.9, stagger: 0.12, ease: 'power3.out',
    });
    gsap.from('.hero-visual', {
      opacity: 0, x: 60, duration: 1.2, delay: 0.3, ease: 'power3.out',
    });

    // Float the dashboard mockup
    gsap.to('.floating-dashboard', {
      y: -12, duration: 3, ease: 'power1.inOut', repeat: -1, yoyo: true,
    });

    // Scroll-triggered reveals using ScrollTrigger batch
    const revealElements = landingRef.current.querySelectorAll('.feature-card, .step-item, .social-proof-inner, .cta-content');
    revealElements.forEach((el) => {
      gsap.set(el, { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
        },
      });
    });

    // Infrastructure teaser - dedicated, more dramatic reveal
    // Targets the inner card so the outer section padding doesn't dilute the movement
    const teaserCard = landingRef.current.querySelector('.infrastructure-teaser-card');
    if (teaserCard) {
      gsap.set(teaserCard, { opacity: 0, y: 60, scale: 0.97 });
      ScrollTrigger.create({
        trigger: teaserCard,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          gsap.to(teaserCard, { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' });
        },
      });
    }
  }, { scope: landingRef });

  // Force dark mode on landing page
  useEffect(() => {
    if (!isAuthenticated && !user) {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark');
    }
  }, [isAuthenticated, user]);

  // Redirect authenticated users with orgs to their most recent org page
  useEffect(() => {
    if (isAuthenticated && user && organizations.length > 0) {
      setIsRedirecting(true);
      const mostRecentOrg = organizations[organizations.length - 1];
      router.push(`/organization/${mostRecentOrg.id}`);
    }
  }, [isAuthenticated, user, organizations, router]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <span className="text-text font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users (after logout or first visit)
  if (!isAuthenticated && !user) {
    return (
      <div ref={landingRef} className="min-h-screen bg-[#0B0C0D] overflow-x-hidden">
        {/* Marquee keyframes for social proof scroll */}
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>

        {/* ====== 1. NAVBAR ====== */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-[#0B0C0D]/90 backdrop-blur-md border-b border-white/10 shadow-sm shadow-black/20'
              : 'bg-transparent'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Image
                src="/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png"
                alt="Javelina"
                width={130}
                height={35}
                priority
              />
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={login}
                  className="text-sm font-medium text-gray-400 hover:text-accent transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={signup}
                  className="inline-flex items-center bg-orange-500 text-white hover:brightness-110 rounded-full px-4 sm:px-5 py-2 text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ====== 2. HERO ====== */}
        <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-orange/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-orange/[0.06] to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text content */}
              <div className="hero-content text-center lg:text-left">
                <h1 className="font-condensed font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.05]">
                  Premium DNS,
                  <br />
                  <span className="text-accent">built on Anycast.</span>
                </h1>

                <p className="mt-6 text-base sm:text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                  Anycast directs each DNS query to the nearest available node via BGP for local resolution, distributed resilience, and automatic failover.
                </p>

                <ul className="mt-6 space-y-2 text-sm sm:text-base text-gray-300 max-w-lg mx-auto lg:mx-0">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    Low-latency DNS resolution worldwide
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    31 PoPs across 6 continents and 19 countries
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    Zero-downtime failover with no TTL-dependent delay
                  </li>
                </ul>

                <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                  <button
                    onClick={signup}
                    className="inline-flex items-center bg-accent text-white hover:brightness-110 rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-base font-semibold shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 transition-all group"
                  >
                    Get started
                    <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => document.querySelector('.features-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-gray-500 hover:text-accent font-medium text-base transition-colors flex items-center gap-2 px-2 py-4"
                  >
                    Learn more
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Right: Floating dashboard mockup */}
              <div className="hero-visual hidden lg:flex justify-end">
                <div className="floating-dashboard relative">
                  {/* Main dashboard card */}
                  <div className="bg-[#1a1b1e] rounded-2xl shadow-2xl border border-white/10 p-6 w-[420px]">
                    {/* Window chrome */}
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <div className="w-3 h-3 rounded-full bg-green-400/80" />
                      <span className="ml-3 text-xs text-gray-500 font-mono">app.javelina.cloud/zones</span>
                    </div>
                    {/* Zone rows */}
                    <div className="space-y-3">
                      {[
                        { name: 'example.com', records: 12, status: 'bg-green-500' },
                        { name: 'api.startup.io', records: 8, status: 'bg-green-500' },
                        { name: 'cdn.enterprise.co', records: 24, status: 'bg-yellow-500' },
                        { name: 'mail.brand.dev', records: 6, status: 'bg-green-500' },
                      ].map((zone, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-surface/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${zone.status}`} />
                            <span className="text-sm font-medium text-gray-300">{zone.name}</span>
                          </div>
                          <span className="text-xs bg-orange/15 text-orange px-2 py-1 rounded-md font-medium">
                            {zone.records} records
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating accent card - bottom left */}
                  <div className="absolute -bottom-6 -left-6 bg-gradient-to-br from-orange to-[#c45a0d] text-white rounded-xl p-4 shadow-xl shadow-orange/20">
                    <div className="text-2xl font-black">Enterprise SLA</div>
                    <div className="text-xs text-white/70">Uptime</div>
                  </div>

                  {/* Floating badge - top right */}
                  <div className="absolute -top-3 -right-3 bg-[#1a1b1e] border border-white/10 rounded-lg px-3 py-2 shadow-lg">
                    <div className="text-xs text-gray-500">Propagation</div>
                    <div className="text-sm font-bold text-green-400">Fast</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== 3. FEATURE TICKER ====== */}
        <section className="social-proof py-8 sm:py-10 border-y border-white/5">
          <div className="social-proof-inner">
            <p className="text-center text-[11px] sm:text-xs text-gray-600 font-medium uppercase tracking-[0.2em] mb-5 sm:mb-6">
              Premium Anycast DNS Infrastructure
            </p>
            <div className="relative overflow-hidden">
              <div
                className="flex gap-2 sm:gap-3 items-center"
                style={{ animation: 'marquee 40s linear infinite', width: 'max-content' }}
              >
                {[...Array(2)].map((_, setIdx) => (
                  <div key={setIdx} className="flex gap-2 sm:gap-3 items-center">
                    {[
                      'Anycast routing',
                      '31 global PoPs',
                      'Low-latency resolution',
                      'BGP path selection',
                      'Zero-downtime failover',
                      'DDoS resilience',
                      '6 continents',
                      'Single IP, 31 nodes',
                      'Local DNS resolution',
                      'No TTL-dependent delays',
                    ].map((feature) => (
                      <span
                        key={`${setIdx}-${feature}`}
                        className="inline-flex items-center justify-center gap-2 bg-surface/5 border border-white/10 rounded-full px-4 py-2 whitespace-nowrap select-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-400">{feature}</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ====== 4. WHY JAVELINA DNS ====== */}
        <section className="features-section py-14 sm:py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Why <span className="text-accent">Javelina DNS</span>
              </h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto font-light">
                Anycast architecture delivers measurable advantages over traditional DNS providers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature 1 - Low-Latency Resolution */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Low-Latency Global Resolution</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Every DNS query is answered by the nearest node. With 31 PoPs across 6 continents, most users resolve from the nearest node with no backhauling or cross-continent round trips.
                </p>
              </div>

              {/* Feature 2 - Zero-Downtime Failover */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Zero-Downtime Failover</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  When a node goes down, BGP reroutes traffic to the next-closest node automatically. No TTL expiration waits, no DNS-level failover scripts.
                </p>
              </div>

              {/* Feature 3 - DDoS Resilience */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Architectural DDoS Resilience</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Attack traffic is distributed across 31 nodes by default. There is no single point of concentration to overwhelm. Resilience is built into the network topology, not bolted on.
                </p>
              </div>

              {/* Feature 4 - Single IP, Global Reach */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Single IP, Global Reach</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  One IP address announced from 31 locations. BGP handles routing to the optimal node automatically. Simplified configuration with no geographic load-balancing complexity on your end.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====== 4a. UNICAST VS ANYCAST ====== */}
        <section className="py-14 sm:py-20 lg:py-24 bg-surface/[0.02] relative overflow-hidden">
          {/* Orange glow on the right side behind Anycast card */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 40% 80% at 75% 50%, rgba(249,115,22,0.12) 0%, transparent 70%)',
            }}
          />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Unicast vs <span className="text-accent">Anycast</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="feature-card rounded-2xl p-6 sm:p-8 border border-white/10 bg-surface/[0.03]">
                <h3 className="text-lg font-bold text-gray-500 mb-3">Traditional Unicast</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  One IP address maps to one physical server. The farther your users are from that server, the more latency and risk you inherit before any content loads.
                </p>
              </div>
              <div className="feature-card rounded-2xl p-6 sm:p-8 border border-orange/30 bg-orange/[0.04] shadow-lg shadow-orange-500/25">
                <h3 className="text-lg font-bold text-accent mb-3">Anycast (Javelina DNS)</h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  The same IP address is announced from many locations, and BGP routes queries to the nearest available node in real time. Local resolution, failover at the routing layer automatically, and distributed resilience under load.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====== 4b. INFRASTRUCTURE TEASER ====== */}
        <section className="infrastructure-teaser py-14 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="infrastructure-teaser-card relative rounded-3xl overflow-hidden border border-white/10 bg-[#131521] p-8 sm:p-12 lg:p-16">
              {/* Orange gradient border glow */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                aria-hidden="true"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.10) 0%, transparent 70%)',
                }}
              />
              {/* Grid texture */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px)',
                }}
              />

              <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-between gap-10">
                {/* Left: text + chips + CTA */}
                <div className="flex-1 text-center lg:text-left max-w-xl">
                  <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight mb-4">
                    Global Anycast <span className="text-orange-400">Network</span>
                  </h2>
                  <p className="text-gray-400 text-base sm:text-lg font-light mb-8 leading-relaxed">
                    A single IP address announced from 31 PoPs across 6 continents and 19 countries. BGP routes every query to the nearest node for low-latency resolution and automatic failover.
                  </p>

                  {/* Inline stat chips */}
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
                    {[
                      { label: '31 PoPs', sub: '6 continents' },
                      { label: 'Low latency', sub: 'resolution' },
                      { label: 'Automatic', sub: 'failover' },
                    ].map((chip) => (
                      <div
                        key={chip.label}
                        className="flex flex-col items-center px-5 py-3 rounded-xl bg-surface/5 border border-white/10"
                      >
                        <span className="text-lg font-bold text-white">{chip.label}</span>
                        <span className="text-xs text-white/40">{chip.sub}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/infrastructure"
                    className="inline-flex items-center gap-2 bg-accent text-white hover:brightness-110 rounded-full px-7 py-3.5 text-sm font-semibold shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 transition-all group"
                  >
                    View Infrastructure
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
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
                  </Link>
                </div>

                {/* Right: decorative mini-map preview */}
                <div className="shrink-0 w-full lg:w-[420px] relative">
                  <div className="rounded-2xl overflow-hidden bg-[#0d0f18] border border-white/10 p-4">
                    {/* Faux map header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Orange glowing dot */}
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                        </span>
                        <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                          Live Network Status
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                        </span>
                        <span className="text-xs text-green-400 font-medium">31 active</span>
                      </div>
                    </div>
                    {/* PoP region rows */}
                    {[
                      { region: 'North America', count: 10 },
                      { region: 'Europe', count: 8 },
                      { region: 'Asia Pacific', count: 9 },
                      { region: 'South America', count: 2 },
                      { region: 'Middle East & Africa', count: 2 },
                    ].map((r) => (
                      <div
                        key={r.region}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className="text-sm text-gray-400">{r.region}</span>
                        </div>
                        <span className="text-xs font-semibold text-white/60">{r.count} PoPs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== 4c. BUILT WITH ZIG ====== */}
        <section className="zig-section py-14 sm:py-20 lg:py-24 bg-surface/[0.02]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Built with <span className="text-accent">Zig</span>
              </h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto font-light">
                Engineered for deterministic performance and reliability where it matters most.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Deterministic Latency</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Explicit memory management with no hidden allocations or garbage collection pauses. We know exactly what our code is doing at every cycle.
                </p>
              </div>

              {/* Card 2 */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Production Reliability</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Compile-time safety checks and explicit error handling catch issues before deployment. Bugs surface during build, not in production.
                </p>
              </div>

              {/* Card 3 */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Modern Systems Foundation</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Native C ABI compatibility allows us to leverage battle-tested libraries without overhead, while maintaining a modern, auditable codebase.
                </p>
              </div>

              {/* Card 4 - Faster Build Cycles */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Faster Build Cycles</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Incremental compile times measured in seconds allow engineers to iterate faster and stay in flow, accelerating feature delivery and bug fixes.
                </p>
              </div>

              {/* Card 5 - Simplified Toolchain */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Simplified Toolchain</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Built-in cross-compilation targets multiple platforms from a single environment, replacing complex toolchains with a single build command.
                </p>
              </div>

              {/* Card 6 - Transparent Codebase */}
              <div className="feature-card group bg-surface/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-accent/50 hover:bg-surface/[0.08] transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Transparent Codebase</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  No hidden control flow or preprocessor macros means code is readable and auditable. What you read is exactly what executes in production.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====== 5. HOW IT WORKS ====== */}
        <section className="how-it-works py-14 sm:py-20 lg:py-28 bg-surface/[0.02]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Get started in <span className="text-accent">minutes</span>
              </h2>
              <p className="mt-4 text-lg text-gray-500 font-light">
                Three simple steps to take control of your DNS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-orange/20 via-orange/40 to-orange/20" aria-hidden="true" />

              {[
                { num: '1', title: 'Create your account', desc: 'Sign up in seconds and start managing your DNS right away.' },
                { num: '2', title: 'Add your zones', desc: 'Import existing DNS zones or create new ones. We support all standard record types.' },
                { num: '3', title: 'Manage with ease', desc: 'Use our intuitive dashboard to manage records, monitor health, and collaborate with your team.' },
              ].map((step, i) => (
                <div key={i} className="step-item text-center relative">
                  <div className="w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-black shadow-lg shadow-orange/25 relative z-10">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====== 6. CTA ====== */}
        <section className="cta-section py-14 sm:py-20 lg:py-28 relative overflow-hidden">
          {/* Hero-section dark background */}
          <div className="absolute inset-0 bg-[#0B0C0D]" />
          {/* Orange glow in the middle */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/[0.12] rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative cta-content">
            <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight mb-4">
              Ready to take control of your <span className="text-accent">DNS</span>?
            </h2>
            <p className="text-lg sm:text-xl text-white/80 mb-10 font-light max-w-2xl mx-auto">
              Join teams already using Javelina to manage their infrastructure.
              Get started in minutes.
            </p>
            <button
              onClick={signup}
              className="inline-flex items-center bg-orange-500 text-white hover:brightness-110 rounded-full px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all group"
            >
              Get started
              <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </section>

        {/* ====== 7. FOOTER ====== */}
        <footer className="bg-[#0B0C0D] border-t border-white/10 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center text-center gap-6">
              <Image
                src="/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png"
                alt="Javelina"
                width={150}
                height={41}
              />
              <p className="text-sm text-gray-600">&copy; 2026 Javelina DNS. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Show loading state while redirecting users with orgs
  if (isRedirecting || (isAuthenticated && user && organizations.length > 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <span className="text-text">Loading...</span>
        </div>
      </div>
    );
  }

  // Show welcome dashboard for authenticated users without organizations
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
      {/* Email Verification Banner */}
      {user && !user.email_verified && (
        <EmailVerificationBanner email={user.email} />
      )}

      {/* Hero Section - Welcome */}
      <div className="mb-8">
        <h1 className="font-black font-sans text-4xl text-text mb-2">
          Welcome to Javelina
        </h1>
        <p className="font-light text-text-muted text-lg">
          Get started with DNS management in just a few simple steps
        </p>
      </div>

      {/* Content Grid - Welcome View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card
          title="Quick Actions"
          description="Common tasks and shortcuts"
          className="lg:col-span-1 h-fit"
        >
          <div className="space-y-4 mt-4">
            <Link href="/pricing/start" className="block">
              <Button variant="primary" className="w-full justify-start">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Organization
              </Button>
            </Link>
            <Link href="/profile" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Your Profile
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </Button>
            </Link>
          </div>
        </Card>

        {/* Welcome Guidance */}
        <Card
          title="Getting Started with Javelina"
          description="Follow these steps to set up your DNS infrastructure"
          className="lg:col-span-2"
        >
          <WelcomeGuidance />
        </Card>
      </div>
    </div>
  );
}
