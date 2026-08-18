'use client';

import type { ReactNode } from 'react';
import { BusinessTopbar } from '@/components/business/dashboard/BusinessTopbar';
import { useBusinessTheme } from '@/lib/stores/business-theme-store';

/**
 * The business sub-app chrome. Split out of app/business/layout.tsx so that
 * layout can be a server component and resolve the brand before render.
 *
 * Behaviour is unchanged from the previous inline version.
 */
export function BusinessShell({ children }: { children: ReactNode }) {
  const t = useBusinessTheme();
  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.surfaceAlt,
        color: t.text,
        display: 'flex',
        flexDirection: 'column',
        colorScheme: t.bg === '#0b0d10' ? 'dark' : 'light',
      }}
    >
      <BusinessTopbar />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export default BusinessShell;
