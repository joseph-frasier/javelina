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
                     pathname === '/signup' || 
                     pathname === '/forgot-password' || 
                     pathname === '/reset-password';

  const isPricingOrCheckout = pathname === '/pricing' || pathname === '/checkout';
  
  const isStripeFlow = pathname.startsWith('/stripe/');

  const isAdminRoute = pathname.startsWith('/admin');

  // For pages without Header/Sidebar (auth, pricing, admin), render immediately
  if (isAuthPage || isPricingOrCheckout || isStripeFlow || isAdminRoute) {
    return <>{children}</>;
  }

  // For authenticated routes with Header/Sidebar, show loading until:
  // 1. Auth has initialized AND
  // 2. Either not authenticated (will redirect) OR profile is ready
  if (!hasInitialized || isLoading || (isAuthenticated && !profileReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
        </div>
      </div>
    );
  }

  // If not authenticated after initialization, don't render Header/Sidebar
  // Let ProtectedRoute handle the redirect
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
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
