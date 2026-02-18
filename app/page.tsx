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

export default function HomePage() {
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

    // Infrastructure teaser — dedicated, more dramatic reveal
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
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark font-medium">Loading...</span>
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
                  className="text-sm font-medium text-gray-400 hover:text-orange transition-colors"
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
                  DNS that
                  <br />
                  <span className="text-orange">just works.</span>
                </h1>

                <p className="mt-6 text-base sm:text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                  Built for teams that need speed, security, and total control.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                  <button
                    onClick={signup}
                    className="inline-flex items-center bg-orange text-white hover:brightness-110 rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-base font-semibold shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 transition-all group"
                  >
                    Get started
                    <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => document.querySelector('.features-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-gray-500 hover:text-orange font-medium text-base transition-colors flex items-center gap-2 px-2 py-4"
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
                      <span className="ml-3 text-xs text-gray-500 font-mono">javelina.app/zones</span>
                    </div>
                    {/* Zone rows */}
                    <div className="space-y-3">
                      {[
                        { name: 'example.com', records: 12, status: 'bg-green-500' },
                        { name: 'api.startup.io', records: 8, status: 'bg-green-500' },
                        { name: 'cdn.enterprise.co', records: 24, status: 'bg-yellow-500' },
                        { name: 'mail.brand.dev', records: 6, status: 'bg-green-500' },
                      ].map((zone, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
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
                    <div className="text-2xl font-black">99.99%</div>
                    <div className="text-xs text-white/70">Uptime SLA</div>
                  </div>

                  {/* Floating badge - top right */}
                  <div className="absolute -top-3 -right-3 bg-[#1a1b1e] border border-white/10 rounded-lg px-3 py-2 shadow-lg">
                    <div className="text-xs text-gray-500">Propagation</div>
                    <div className="text-sm font-bold text-green-400">&lt;50ms</div>
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
              Built for modern DNS management
            </p>
            <div className="relative overflow-hidden">
              <div
                className="flex gap-2 sm:gap-3 items-center"
                style={{ animation: 'marquee 40s linear infinite', width: 'max-content' }}
              >
                {[...Array(2)].map((_, setIdx) => (
                  <div key={setIdx} className="flex gap-2 sm:gap-3 items-center">
                    {[
                      'Real-time propagation',
                      'Role-based access control',
                      'Multi-org management',
                      'Full audit logging',
                      'DNSSEC roadmap',
                      'Bulk record operations',
                      'Zone health monitoring',
                      'Programmatic access',
                      '10 record types',
                      'Team workspaces',
                    ].map((feature) => (
                      <span
                        key={`${setIdx}-${feature}`}
                        className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 whitespace-nowrap select-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-400">{feature}</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ====== 4. FEATURES ====== */}
        <section className="features-section py-14 sm:py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Everything you need to
                <br />
                <span className="text-orange">manage DNS at scale</span>
              </h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto font-light">
                From single zones to complex multi-domain infrastructure,
                Javelina gives your team full control.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="feature-card group bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-orange/50 hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Lightning Fast</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Sub-50ms propagation with real-time updates. Your DNS changes go live instantly across global infrastructure.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="feature-card group bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-orange/50 hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Enterprise Security</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  256-bit encryption, comprehensive audit trails, and granular role-based access controls for every team member.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="feature-card group bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-orange/50 hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange to-orange/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-orange/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Team Collaboration</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Manage zones across organizations with role-based permissions, team workspaces, and real-time collaboration.
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
                    30 strategically placed Points of Presence across 6 regions, sub-5ms
                    resolution for 95% of the internet.
                  </p>

                  {/* Inline stat chips */}
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
                    {[
                      { label: '30 PoPs', sub: 'worldwide' },
                      { label: '<5ms', sub: 'avg latency' },
                      { label: '99.99%', sub: 'uptime SLA' },
                    ].map((chip) => (
                      <div
                        key={chip.label}
                        className="flex flex-col items-center px-5 py-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <span className="text-lg font-bold text-white">{chip.label}</span>
                        <span className="text-xs text-white/40">{chip.sub}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/infrastructure"
                    className="inline-flex items-center gap-2 bg-orange text-white hover:brightness-110 rounded-full px-7 py-3.5 text-sm font-semibold shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 transition-all group"
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
                        <span className="text-xs text-green-400 font-medium">30 active</span>
                      </div>
                    </div>
                    {/* PoP region rows */}
                    {[
                      { region: 'North America', count: 11 },
                      { region: 'Europe', count: 7 },
                      { region: 'Asia Pacific', count: 8 },
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

        {/* ====== 5. HOW IT WORKS ====== */}
        <section className="how-it-works py-14 sm:py-20 lg:py-28 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-condensed font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Get started in <span className="text-orange">minutes</span>
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
                  <div className="w-14 h-14 bg-orange text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-black shadow-lg shadow-orange/25 relative z-10">
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
              Ready to take control of your DNS?
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
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
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
        <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
          Welcome to Javelina
        </h1>
        <p className="font-light text-gray-slate text-lg">
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
            <Link href="/pricing" className="block">
              <Button variant="primary" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
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
                  className="w-5 h-5 mr-2"
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
                  className="w-5 h-5 mr-2"
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
