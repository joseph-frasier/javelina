'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Hide sidebar and header on authentication pages, pricing/checkout, and admin routes
  const isAuthPage = pathname === '/login' || 
                     pathname === '/signup' || 
                     pathname === '/forgot-password' || 
                     pathname === '/reset-password';

  const isPricingOrCheckout = pathname === '/pricing' || pathname === '/checkout';

  const isAdminRoute = pathname.startsWith('/admin');

  if (isAuthPage || isPricingOrCheckout || isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </div>
  );
}
