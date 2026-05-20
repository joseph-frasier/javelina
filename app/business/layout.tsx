'use client';

import type { ReactNode } from 'react';
import { BusinessTopbar } from '@/components/business/dashboard/BusinessTopbar';
import { useBusinessTheme } from '@/lib/business-theme-store';

export default function BusinessLayout({ children }: { children: ReactNode }) {
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}
