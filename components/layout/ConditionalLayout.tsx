'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { useImpersonationStore } from '@/lib/admin-impersonation';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isImpersonating } = useImpersonationStore();
  
  // Hide sidebar and header on authentication pages and admin routes
  const isAuthPage = pathname === '/login' || 
                     pathname === '/signup' || 
                     pathname === '/forgot-password' || 
                     pathname === '/reset-password';

  const isAdminRoute = pathname.startsWith('/admin');

  if (isAuthPage || isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen">
      {isImpersonating && <ImpersonationBanner />}
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
