'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { useImpersonationStore } from '@/lib/admin-impersonation';
import { useAuthStore } from '@/lib/auth-store';
import { AIChatWidget } from '@/components/chat/AIChatWidget';
import { IdleLogoutGuard } from '@/components/auth/IdleLogoutGuard';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isImpersonating } = useImpersonationStore();
  const { isAuthenticated, profileReady, isLoading, user } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Track when auth has initialized at least once
  useEffect(() => {
    if (!isLoading && (isAuthenticated || !isAuthenticated)) {
      setHasInitialized(true);
    }
  }, [isLoading, isAuthenticated]);
  
  // Hide sidebar and header on authentication pages, pricing/checkout/stripe pages, and admin routes
  const isAuthPage = pathname === '/login' || 
                     pathname === '/forgot-password';

  const isPricingOrCheckout = pathname === '/pricing' || pathname === '/checkout' || pathname.startsWith('/pricing/');

  const isLegalPage = pathname.startsWith('/legal') || pathname.startsWith('/terms');

  const isPublicMarketingPage = pathname === '/infrastructure';
  
  const isStripeFlow = pathname.startsWith('/stripe/');

  const isAdminRoute = pathname.startsWith('/admin');

  const isInviteFlow = pathname.startsWith('/invite/') || pathname === '/email-verified';

  const isBusinessRoute = pathname.startsWith('/business');

  // For pages without Header/Sidebar (auth, pricing, admin, public marketing, invite, business), render immediately
  if (isAuthPage || isPricingOrCheckout || isLegalPage || isStripeFlow || isAdminRoute || isPublicMarketingPage || isInviteFlow || isBusinessRoute) {
    return (
      <>
        <IdleLogoutGuard />
        {children}
      </>
    );
  }

  // For authenticated routes with Header/Sidebar, show loading until:
  // 1. Auth has initialized AND
  // 2. Either not authenticated (will redirect) OR profile is ready
  if (!hasInitialized || isLoading || (isAuthenticated && !profileReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2.5 text-text-muted text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-r-transparent"></div>
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  // If not authenticated after initialization, render without layout
  if (!isAuthenticated && hasInitialized) {
    // Root path shows landing page, other paths show redirect
    if (pathname === '/') {
      // Landing page - no header/sidebar
      return (
        <>
          <IdleLogoutGuard />
          {children}
        </>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2.5 text-text-muted text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-r-transparent"></div>
          <span>Redirecting…</span>
        </div>
      </div>
    );
  }

  // Authenticated users get full layout with header/sidebar
  return (
    <>
      <IdleLogoutGuard />
      <div className="flex flex-col h-screen">
        {isImpersonating && <ImpersonationBanner />}
        <Header 
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            isMobileMenuOpen={isMobileMenuOpen} 
            onMobileMenuClose={() => setIsMobileMenuOpen(false)} 
          />
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </div>
      <AIChatWidget />
    </>
  );
}
