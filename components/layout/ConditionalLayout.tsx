'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { useImpersonationStore } from '@/lib/admin-impersonation';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isImpersonating } = useImpersonationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  // Hide sidebar and header on authentication pages, pricing/checkout/stripe pages, and admin routes
  const isAuthPage = pathname === '/login' || 
                     pathname === '/signup' || 
                     pathname === '/forgot-password' || 
                     pathname === '/reset-password';

  const isPricingOrCheckout = pathname === '/pricing' || pathname === '/checkout';
  
  const isStripeFlow = pathname.startsWith('/stripe/');

  const isAdminRoute = pathname.startsWith('/admin');

  if (isAuthPage || isPricingOrCheckout || isStripeFlow || isAdminRoute) {
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
