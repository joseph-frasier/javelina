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
  
  // Hide sidebar and header on authentication pages
  const isAuthPage = pathname === '/login' || 
                     pathname === '/signup' || 
                     pathname === '/forgot-password' || 
                     pathname === '/reset-password';

  if (isAuthPage) {
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
